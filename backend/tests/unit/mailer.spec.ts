import { describe, expect, it } from "vitest";
import { renderPasswordResetEmail } from "../../src/lib/mailer.js";

describe("renderPasswordResetEmail", () => {
  const mail = { to: "ana@example.com", name: "Ana <b>", link: "https://web.test/s2_nova/restablecer?token=abc%3D", token: "abc=" };

  it("includes the brand logo, the link as a button and the Android code", () => {
    const { html, text, subject } = renderPasswordResetEmail(mail);
    expect(subject).toContain("S2 Nova");
    expect(html).toContain('alt="S2 Nova"');
    expect(html).toContain("/email/logo-mark.png");
    expect(html).toContain('href="https://web.test/s2_nova/restablecer?token=abc%3D"');
    expect(html).toContain("abc=");
    expect(text).toContain(mail.link);
  });

  it("escapes the user's name so it cannot inject markup", () => {
    const { html } = renderPasswordResetEmail(mail);
    expect(html).toContain("Ana &lt;b&gt;");
    expect(html).not.toContain("Ana <b>");
  });
});
