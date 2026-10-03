# Add project specific ProGuard rules here.

# DTOs travel through kotlinx.serialization (Retrofit converter). The
# library ships its own rules; keeping the models too guards against a
# field renamed by R8 silently breaking the API contract.
-keep,includedescriptorclasses class com.s2nova.app.data.remote.** { *; }
-keepclassmembers class com.s2nova.app.data.** {
    *** Companion;
    kotlinx.serialization.KSerializer serializer(...);
}

# DataStore Preferences keeps its files as protobuf-lite, which reads the
# message fields by name. The library's own rule keeps the fields; keeping
# the shaded runtime and the generated messages whole rules out R8 full
# mode changing how a file is written or read.
-keep class androidx.datastore.preferences.protobuf.** { *; }
-keep class androidx.datastore.preferences.PreferencesProto** { *; }
