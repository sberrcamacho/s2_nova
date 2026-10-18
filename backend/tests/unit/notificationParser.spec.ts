import { describe, expect, it, vi } from "vitest";
import { guessSlug, maskDigits, parseNotification, parseWithRules, readNumber } from "../../src/services/notificationParser.js";
import { env } from "../../src/env.js";

const n = (text: string, title = "", appLabel = "Banco") => ({ appLabel, title, text });

describe("notification parser", () => {
  it("reads Colombian amount formats", () => {
    expect(readNumber("25.000")).toBe(25000);
    expect(readNumber("1.234.567,89")).toBe(1234567.89);
    expect(readNumber("1,234,567.89")).toBe(1234567.89);
    expect(readNumber("5,99")).toBe(5.99);
    expect(readNumber("25000")).toBe(25000);
    expect(readNumber("0")).toBeNull();
  });

  it("reads purchases, with the merchant and a category guess", () => {
    expect(parseWithRules(n("Compraste $25.000 en EXITO CALLE 80 con tu tarjeta *1234.", "Bancolombia"))).toEqual({
      type: "EXPENSE", amount: 25000, currency: "COP", merchant: "EXITO CALLE 80", categorySlug: "exp.food.groceries", parsedBy: "RULES",
    });
    expect(parseWithRules(n("Pagaste COP 38.900 en UBER *TRIP el 17/10."))).toMatchObject({ type: "EXPENSE", amount: 38900, merchant: "UBER *TRIP", categorySlug: "exp.transportation.rideshare" });
    expect(parseWithRules(n("Se realizó una compra por US$5,99 en Netflix.com"))).toMatchObject({ type: "EXPENSE", amount: 5.99, currency: "USD", categorySlug: "exp.entertainment.streaming" });
  });

  it("reads money received and sent", () => {
    expect(parseWithRules(n("Recibiste $150.000 de Camilo Restrepo en tu Nequi", "Nequi"))).toMatchObject({ type: "INCOME", amount: 150000, merchant: "Camilo Restrepo" });
    expect(parseWithRules(n("Te consignaron $4.400.000 por nómina", "Davivienda"))).toMatchObject({ type: "INCOME", amount: 4400000, categorySlug: "inc.work.salary" });
    expect(parseWithRules(n("Enviaste $20.000 a Daniela Gómez", "Nequi"))).toMatchObject({ type: "EXPENSE", amount: 20000, merchant: "Daniela Gómez" });
  });

  it("ignores codes, login alerts and texts without an amount or a direction", () => {
    expect(parseWithRules(n("Tu código de verificación es 482913. No lo compartas."))).toBeNull();
    expect(parseWithRules(n("Iniciaste sesión en un nuevo dispositivo"))).toBeNull();
    expect(parseWithRules(n("Compra aprobada en tu tarjeta"))).toBeNull();
    expect(parseWithRules(n("Hoy tenemos 20% de descuento en $50.000 de mercado"))).toBeNull();
  });

  it("masks card and account numbers before the AI sees them", () => {
    expect(maskDigits("Tarjeta 4567 1234, cuenta 0012345678, $25.000")).toBe("Tarjeta •••• ••••, cuenta ••••••••••, $25.000");
  });

  it("asks the AI only when allowed and the rules don't know the text", async () => {
    const original = env.GEMINI_API_KEY;
    (env as { GEMINI_API_KEY: string }).GEMINI_API_KEY = "test-key";
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"isMovement":true,"type":"EXPENSE","amount":12000,"currency":"COP","merchant":"Tienda Don José"}' }] } }] })),
    );
    const odd = n("Movimiento por 12.000 pesos en Tienda Don José, cuenta 1234567");
    expect(await parseNotification(odd, { allowAi: false, fetcher })).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(await parseNotification(odd, { allowAi: true, fetcher })).toMatchObject({ type: "EXPENSE", amount: 12000, merchant: "Tienda Don José", parsedBy: "AI" });
    const sent = JSON.parse((fetcher.mock.calls[0] as unknown as [string, { body: string }])[1].body).contents[0].parts[0].text as string;
    expect(sent).toContain("•••••••");
    expect(sent).not.toContain("1234567");
    // A code never reaches the AI.
    expect(await parseNotification(n("Tu clave dinámica es 1234"), { allowAi: true, fetcher })).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    (env as { GEMINI_API_KEY: string }).GEMINI_API_KEY = original;
  });

  it("matches merchants as whole words", () => {
    expect(guessSlug("EXPENSE", "Compraste $20.000 en Paloma Store", "Paloma Store")).toBeNull();
    expect(guessSlug("EXPENSE", "Pagaste $8.000 en un premio", null)).toBeNull();
    expect(guessSlug("EXPENSE", "Compra con tarjeta, contigo siempre", null)).toBeNull();
    expect(guessSlug("EXPENSE", "Pagaste $3.200 en Metro de Medellín", "Metro de Medellín")).toBe("exp.transportation.public_transit");
    expect(guessSlug("EXPENSE", "Compraste $45.000 en Metro Calle 80", "Metro Calle 80")).toBe("exp.food.groceries");
    expect(guessSlug("EXPENSE", "Compraste $9.000 en OMA Andino", "OMA Andino")).toBe("exp.food.cafes");
  });
});
