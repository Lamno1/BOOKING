package com.stayos.http;

import com.sun.net.httpserver.Headers;

/** Headers every response carries, API or page. */
public final class SecurityHeaders {
  private SecurityHeaders(){}
  public static void apply(Headers h){
    h.set("X-Content-Type-Options","nosniff");
    h.set("X-Frame-Options","DENY");
    h.set("Referrer-Policy","strict-origin-when-cross-origin");
    h.set("Permissions-Policy","camera=(), microphone=(), geolocation=(), payment=()");
    h.set("Cross-Origin-Opener-Policy","same-origin");
  }
}
