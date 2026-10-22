package com.stayos;

import com.stayos.auth.*;
import com.stayos.booking.BookingService;
import com.stayos.http.ServerConfig;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

/** Protections that matter once the app is reachable from outside: guessing, flooding, headers, static files. */
class SecurityTest {
  @TempDir Path temp;
  AuthService auth; BookingService bookings; AuthServer server;
  HttpClient client=HttpClient.newHttpClient();

  void start(ServerConfig config)throws Exception{
    String url="jdbc:sqlite:"+temp.resolve("test.sqlite");
    auth=new AuthService(url,"admin@example.test","test-admin-password",false);
    bookings=new BookingService(url);server=new AuthServer(auth,bookings,0,config);server.start();
  }
  @AfterEach void stop()throws Exception{if(server!=null)server.stop();if(bookings!=null)bookings.close();if(auth!=null)auth.close();}
  HttpResponse<String> get(String path,String... headers)throws Exception{
    var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+server.port()+path));if(headers.length>0)b.headers(headers);
    return client.send(b.GET().build(),HttpResponse.BodyHandlers.ofString());
  }
  HttpResponse<String> login(String email,String password)throws Exception{
    return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+server.port()+"/api/auth/login")).header("Content-Type","application/json")
      .POST(HttpRequest.BodyPublishers.ofString("{\"email\":\""+email+"\",\"password\":\""+password+"\"}")).build(),HttpResponse.BodyHandlers.ofString());
  }

  @Test void accountLocksAfterRepeatedWrongPasswordsEvenForTheRightOne()throws Exception{
    start(ServerConfig.local());
    for(int i=0;i<8;i++)assertEquals(401,login("admin@example.test","wrong-password-"+i).statusCode());
    var locked=login("admin@example.test","test-admin-password");
    assertEquals(429,locked.statusCode());assertTrue(locked.body().contains("15 phút"));
    // Other accounts are unaffected by someone guessing at the admin.
    auth.register("guest@example.test","guest-password-1","Guest");
    assertEquals(200,login("guest@example.test","guest-password-1").statusCode());
  }

  @Test void oneSlowLoginDoesNotStallOtherRequests()throws Exception{
    start(ServerConfig.local());
    auth.register("guest@example.test","guest-password-1","Guest");
    var pool=Executors.newFixedThreadPool(6);
    try{
      for(int i=0;i<6;i++)pool.submit(()->{for(int k=0;k<3;k++)login("guest@example.test","guest-password-1");return null;});
      Thread.sleep(100);
      long started=System.nanoTime();
      for(int i=0;i<10;i++)assertEquals(401,get("/api/state").statusCode());
      long perRequest=(System.nanoTime()-started)/10/1_000_000;
      assertTrue(perRequest<150,"auth checks waited "+perRequest+" ms behind password hashing");
    }finally{pool.shutdown();assertTrue(pool.awaitTermination(30,TimeUnit.SECONDS));}
  }

  @Test void floodFromOneAddressIsCutOffWithRetryAfter()throws Exception{
    start(ServerConfig.local().withRate(30));
    for(int i=0;i<30;i++)assertEquals(200,get("/api/health").statusCode());
    var blocked=get("/api/health","Origin","http://127.0.0.1:5174");
    assertEquals(429,blocked.statusCode());
    assertEquals("60",blocked.headers().firstValue("Retry-After").orElse(""));
    assertEquals("http://127.0.0.1:5174",blocked.headers().firstValue("Access-Control-Allow-Origin").orElse(""),"the browser must be able to read the 429");
  }

  @Test void apiResponsesCarrySecurityHeadersAndForeignOriginsAreRefused()throws Exception{
    start(ServerConfig.local());
    var r=get("/api/health");
    assertEquals("nosniff",r.headers().firstValue("X-Content-Type-Options").orElse(""));
    assertEquals("DENY",r.headers().firstValue("X-Frame-Options").orElse(""));
    assertTrue(r.headers().firstValue("Content-Security-Policy").orElse("").contains("frame-ancestors 'none'"));
    assertEquals(403,get("/api/health","Origin","https://evil.example").statusCode());
  }

  @Test void secureCookieFlagFollowsConfiguration()throws Exception{
    var config=ServerConfig.local();
    start(new ServerConfig(config.bind(),config.origins(),true,false,null,1200));
    auth.register("guest@example.test","guest-password-1","Guest");
    var cookie=login("guest@example.test","guest-password-1").headers().firstValue("Set-Cookie").orElse("");
    assertTrue(cookie.contains("; Secure")&&cookie.contains("HttpOnly")&&cookie.contains("SameSite=Lax"),cookie);
  }

  @Test void builtSiteIsServedSameOriginWithCspAndNothingOutsideItsRoot()throws Exception{
    Path site=Files.createDirectories(temp.resolve("site/assets"));
    Files.writeString(temp.resolve("site/index.html"),"<!doctype html><title>STAYOS</title>");
    Files.writeString(site.resolve("app-abc123.js"),"console.log(1)");
    Files.writeString(temp.resolve("secret.txt"),"do not serve");
    var env=Map.of("STAYOS_WEB_ROOT",temp.resolve("site").toString());
    start(ServerConfig.fromEnvironment(env));
    var page=get("/");
    assertEquals(200,page.statusCode());assertTrue(page.body().contains("STAYOS"));
    assertTrue(page.headers().firstValue("Content-Security-Policy").orElse("").contains("script-src 'self'"));
    assertEquals("no-cache",page.headers().firstValue("Cache-Control").orElse(""));
    var asset=get("/assets/app-abc123.js");
    assertTrue(asset.headers().firstValue("Cache-Control").orElse("").contains("immutable"));
    assertTrue(asset.headers().firstValue("Content-Type").orElse("").startsWith("text/javascript"));
    assertEquals(200,get("/trips").statusCode(),"app routes fall back to index.html");
    for(String probe:List.of("/../secret.txt","/%2e%2e/secret.txt","/assets/../../secret.txt","/missing.js"))
      assertNotEquals("do not serve",get(probe).body(),probe);
    assertEquals(404,get("/missing.js").statusCode());
    int port=server.port();
    assertEquals(200,get("/api/health","Origin","http://127.0.0.1:"+port).statusCode(),"same-origin page needs no CORS entry");
  }

  @Test void demoDefaultAdminPasswordIsDetectedAndPublicModeIsRecognised()throws Exception{
    String url="jdbc:sqlite:"+temp.resolve("demo.sqlite");
    try(var demo=new AuthService(url,null,null,true)){assertEquals(List.of("admin@stayos.demo"),demo.adminsWithDefaultPassword());}
    String strong="jdbc:sqlite:"+temp.resolve("strong.sqlite");
    try(var real=new AuthService(strong,"owner@example.test","a-long-unique-passphrase",false)){assertEquals(List.of(),real.adminsWithDefaultPassword());}
    assertThrows(IllegalArgumentException.class,()->new AuthService("jdbc:sqlite:"+temp.resolve("x.sqlite"),null,"a-long-unique-passphrase",false));
    assertFalse(ServerConfig.local().isPublic());
    assertTrue(ServerConfig.fromEnvironment(Map.of("STAYOS_SECURE_COOKIE","true")).isPublic());
    assertTrue(ServerConfig.fromEnvironment(Map.of("STAYOS_BIND","0.0.0.0")).isPublic());
  }

  HttpResponse<String> post(String path,String json,String cookie)throws Exception{
    var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+server.port()+path)).header("Content-Type","application/json");
    if(cookie!=null)b.header("Cookie",cookie);
    return client.send(b.POST(HttpRequest.BodyPublishers.ofString(json)).build(),HttpResponse.BodyHandlers.ofString());
  }
  @Test void staffIssuedResetCodeWorksOnceForGuestsOnly()throws Exception{
    start(ServerConfig.local());
    auth.register("guest@example.test","old-guest-password","Guest");
    String guestCookie=login("guest@example.test","old-guest-password").headers().firstValue("Set-Cookie").orElseThrow().split(";")[0];
    String adminCookie=login("admin@example.test","test-admin-password").headers().firstValue("Set-Cookie").orElseThrow().split(";")[0];
    assertEquals(403,post("/api/admin/users/reset-code","{\"email\":\"guest@example.test\"}",guestCookie).statusCode(),"guests cannot issue codes");
    assertEquals(403,post("/api/admin/users/reset-code","{\"email\":\"admin@example.test\"}",adminCookie).statusCode(),"no codes for staff accounts");
    var issued=post("/api/admin/users/reset-code","{\"email\":\"guest@example.test\"}",adminCookie);
    assertEquals(200,issued.statusCode(),issued.body());
    String code=com.google.gson.JsonParser.parseString(issued.body()).getAsJsonObject().get("code").getAsString();
    assertEquals(10,code.length());
    assertEquals(400,post("/api/auth/reset","{\"email\":\"guest@example.test\",\"code\":\"WRONGCODE1\",\"newPassword\":\"brand-new-password\"}",null).statusCode());
    assertEquals(400,post("/api/auth/reset","{\"email\":\"guest@example.test\",\"code\":\""+code+"\",\"newPassword\":\"short\"}",null).statusCode());
    assertEquals(200,post("/api/auth/reset","{\"email\":\"guest@example.test\",\"code\":\""+code.toLowerCase()+"\",\"newPassword\":\"brand-new-password\"}",null).statusCode());
    assertEquals(400,post("/api/auth/reset","{\"email\":\"guest@example.test\",\"code\":\""+code+"\",\"newPassword\":\"another-new-password\"}",null).statusCode(),"one use only");
    assertEquals(401,get("/api/state","Cookie",guestCookie).statusCode(),"old sessions end");
    assertEquals(401,login("guest@example.test","old-guest-password").statusCode());
    assertEquals(200,login("guest@example.test","brand-new-password").statusCode());
  }

  @Test void configurationRejectsMalformedOrigins(){
    assertThrows(IllegalArgumentException.class,()->ServerConfig.fromEnvironment(Map.of("STAYOS_ALLOWED_ORIGINS","javascript:alert(1)")));
    assertTrue(ServerConfig.fromEnvironment(Map.of("STAYOS_ALLOWED_ORIGINS","https://stayos.vn, https://www.stayos.vn")).origins().contains("https://www.stayos.vn"));
  }
}
