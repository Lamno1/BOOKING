package com.stayos.auth;

import com.google.gson.*;
import com.stayos.booking.BookingService;
import com.stayos.booking.BookingService.Failure;
import com.stayos.http.*;
import com.stayos.http.Router.Access;
import com.stayos.http.Router.Call;
import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

public final class AuthServer {
  private final HttpServer server;
  private final AuthService auth;
  private final BookingService booking;
  private final String sessionCookie;
  private final Gson gson = new GsonBuilder().setStrictness(Strictness.STRICT).serializeNulls().create();
  private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
  private final Map<String,ArrayDeque<Long>> attempts = new HashMap<>();
  private final Map<String,long[]> traffic = new ConcurrentHashMap<>();
  private final ServerConfig config;
  private final Router router;

  public AuthServer(AuthService auth,BookingService booking)throws IOException{this(auth,booking,8080);}
  public AuthServer(AuthService auth,BookingService booking,int port)throws IOException{this(auth,booking,port,ServerConfig.local());}
  public AuthServer(AuthService auth,BookingService booking,int port,ServerConfig config)throws IOException{
    this.auth=auth;this.booking=booking;this.config=config;this.router=routes();server=HttpServer.create(new InetSocketAddress(config.bind(),port),0);
    sessionCookie=port==8080?"stayos_session":"stayos_session_"+server.getAddress().getPort();
    server.createContext("/api/",this::handle);server.setExecutor(executor);
    if(config.webRoot()!=null)server.createContext("/",new StaticSite(config.webRoot()));
  }
  public int port(){return server.getAddress().getPort();}
  /** The API route table, for contract tests. */
  public Router router(){return router;}
  public void start(){server.start();}
  public void stop(){server.stop(0);executor.shutdownNow();}
  /** One line per API call (method, path, status, time); no query strings, bodies or cookies. Enabled by ApiMain unless STAYOS_ACCESS_LOG=off. */
  private static final boolean ACCESS_LOG=Boolean.getBoolean("stayos.accessLog");
  private void handle(HttpExchange x)throws IOException{
    long started=System.nanoTime();
    try {
      SecurityHeaders.apply(x.getResponseHeaders());
      x.getResponseHeaders().set("Content-Security-Policy","default-src 'none'; frame-ancestors 'none'");
      String origin=x.getRequestHeaders().getFirst("Origin");
      if(origin!=null&&!config.origins().contains(origin)&&!sameOrigin(x,origin))throw new Failure(403,"Origin không được phép.");
      if(origin!=null)x.getResponseHeaders().set("Access-Control-Allow-Origin",origin);
      x.getResponseHeaders().set("Vary","Origin");x.getResponseHeaders().set("Access-Control-Allow-Credentials","true");
      x.getResponseHeaders().set("Access-Control-Allow-Headers","Content-Type");
      x.getResponseHeaders().set("Access-Control-Allow-Methods","GET, POST, OPTIONS");
      throttle(x);
      String method=x.getRequestMethod(),path=x.getRequestURI().getPath();
      if("OPTIONS".equals(method)){x.sendResponseHeaders(204,-1);return;}
      if(!Set.of("GET","POST").contains(method))throw new Failure(405,"Method không được hỗ trợ.");
      JsonObject input=new JsonObject();
      if("POST".equals(method)){
        String contentType=x.getRequestHeaders().getFirst("Content-Type");
        if(contentType==null||!contentType.toLowerCase(Locale.ROOT).startsWith("application/json"))throw new Failure(415,"Yêu cầu JSON.");
        byte[] bytes=x.getRequestBody().readNBytes(16_385);
        if(bytes.length>16_384)throw new Failure(413,"Yêu cầu quá lớn.");
        try{input=gson.fromJson(new String(bytes,StandardCharsets.UTF_8),JsonObject.class);if(input==null)throw new JsonParseException("empty");}
        catch(JsonParseException e){throw new Failure(400,"JSON không hợp lệ.");}
      }
      var match=router.match(method,path).orElseThrow(()->new Failure(404,"Không tìm thấy chức năng."));
      var route=match.route();
      if(route.limited())rateLimit(x);
      var user=route.access()==Access.SIGNED_IN?auth.authenticate(token(x)).orElseThrow(()->new Failure(401,"Vui lòng đăng nhập để tiếp tục.")):null;
      send(x,route.status(),route.handler().handle(new Call(x,input,user,query(x),match.params())));
    }catch(Failure e){send(x,e.status,Map.of("error",e.getMessage()));}
    catch(IllegalArgumentException e){send(x,400,Map.of("error","Dữ liệu chưa hợp lệ."));}
    catch(Exception e){System.err.println("API error "+x.getRequestMethod()+" "+x.getRequestURI().getPath()+": "+e.getClass().getSimpleName()+" "+e.getMessage());send(x,500,Map.of("error","Không thể lưu dữ liệu lúc này. Vui lòng thử lại."));}
    finally{x.close();if(ACCESS_LOG)System.out.println(java.time.Instant.now()+" "+x.getRequestMethod()+" "+x.getRequestURI().getPath()+" "+x.getResponseCode()+" "+(System.nanoTime()-started)/1_000_000+"ms");}
  }
  /** Every API endpoint, grouped by feature. Handlers stay one line: validation and rules live in the services. */
  private Router routes(){
    var r=new Router();
    // Public catalog
    r.get("/api/health",Access.PUBLIC,c->{if(!booking.ping())throw new Failure(503,"Cơ sở dữ liệu chưa sẵn sàng.");return Map.of("status","ok","auth",true,"booking",true);});
    r.get("/api/availability",Access.PUBLIC,c->booking.availability(c.query("arrival",""),c.query("departure","")));
    r.get("/api/rooms/{room}/calendar",Access.PUBLIC,c->booking.calendar(c.param(0),c.query("from",""),days(c.query("days","60"))));
    r.get("/api/rooms/{room}/reviews",Access.PUBLIC,c->booking.roomReviews(c.param(0)));
    r.get("/api/reviews/summary",Access.PUBLIC,c->booking.reviewSummary());
    // Account and session
    r.post("/api/auth/login",Access.PUBLIC,c->signIn(c,false)).limited();
    r.create("/api/auth/register",Access.PUBLIC,c->signIn(c,true)).limited();
    r.post("/api/auth/reset",Access.PUBLIC,c->{
      if(!auth.resetWithCode(BookingService.text(c.input(),"email",254),secret(c.input(),"code"),secret(c.input(),"newPassword")))throw new Failure(400,"Mã không đúng, đã dùng hoặc đã hết hạn, hoặc mật khẩu mới chưa đủ 12 ký tự.");
      return Map.of("ok",true);}).limited();
    r.get("/api/auth/me",Access.SIGNED_IN,c->Map.of("user",c.user()));
    r.post("/api/auth/logout",Access.SIGNED_IN,c->{auth.logout(token(c.exchange()));cookie(c.exchange(),"",0);return Map.of("ok",true);});
    r.post("/api/auth/password",Access.SIGNED_IN,c->{
      if(!auth.changePassword(c.user(),secret(c.input(),"currentPassword"),secret(c.input(),"newPassword")))throw new Failure(400,"Mật khẩu hiện tại chưa đúng hoặc mật khẩu mới chưa đủ 12 ký tự.");
      cookie(c.exchange(),"",0);return Map.of("ok",true);}).limited();
    r.get("/api/state",Access.SIGNED_IN,c->booking.state(c.user(),false));
    r.get("/api/saved",Access.SIGNED_IN,c->booking.saved(c.user()));
    r.post("/api/saved",Access.SIGNED_IN,c->booking.setSaved(c.user(),c.input()));
    // Reservations
    r.create("/api/bookings",Access.SIGNED_IN,c->booking.create(c.user(),c.input()));
    r.post("/api/bookings/{id}/status",Access.SIGNED_IN,c->booking.transition(c.user(),c.param(0),BookingService.text(c.input(),"status",30)));
    r.post("/api/bookings/{id}/arrival",Access.SIGNED_IN,c->booking.updateArrival(c.user(),c.param(0),c.input()));
    r.post("/api/bookings/{id}/change-quote",Access.SIGNED_IN,c->booking.changeQuote(c.user(),c.param(0),c.input()));
    // Extra services
    r.create("/api/services",Access.SIGNED_IN,c->booking.addService(c.user(),c.input()));
    r.post("/api/services/{id}/cancel",Access.SIGNED_IN,c->booking.cancelRequest(c.user(),c.param(0)));
    r.post("/api/services/{id}/confirm",Access.SIGNED_IN,c->booking.confirmRequest(c.user(),c.param(0)));
    // Support desk
    r.create("/api/support",Access.SIGNED_IN,c->booking.createSupport(c.user(),c.input())).limited();
    r.post("/api/support/{id}/messages",Access.SIGNED_IN,c->booking.replySupport(c.user(),c.param(0),c.input(),false)).limited();
    r.post("/api/support/{id}/cancel",Access.SIGNED_IN,c->booking.cancelSupport(c.user(),c.param(0)));
    // Reviews
    r.create("/api/reviews",Access.SIGNED_IN,c->booking.createReview(c.user(),c.input())).limited();
    // Staff console (each service call re-checks the admin role)
    r.get("/api/admin/state",Access.SIGNED_IN,c->booking.state(c.user(),true));
    r.get("/api/admin/security",Access.SIGNED_IN,c->{if(!"admin".equals(c.user().role()))throw new Failure(403,"Bạn không có quyền quản trị.");return Map.of("defaultPassword",auth.usesDefaultPassword(c.user()));});
    r.get("/api/admin/users",Access.SIGNED_IN,c->Map.of("users",auth.users(c.user())));
    r.post("/api/admin/users/status",Access.SIGNED_IN,c->{auth.setStatus(c.user(),BookingService.text(c.input(),"email",254),BookingService.text(c.input(),"status",20));return Map.of("ok",true);});
    r.post("/api/admin/users/reset-code",Access.SIGNED_IN,c->Map.of("code",auth.issueResetCode(c.user(),BookingService.text(c.input(),"email",254)),"expiresInMinutes",30)).limited();
    r.get("/api/admin/rooms",Access.SIGNED_IN,c->booking.operations(c.user(),c.query("arrival",""),c.query("departure","")));
    r.post("/api/admin/rooms/status",Access.SIGNED_IN,c->booking.setRoomOperation(c.user(),c.input()));
    r.post("/api/admin/bookings/{id}/note",Access.SIGNED_IN,c->booking.setStaffNote(c.user(),c.param(0),c.input()));
    r.post("/api/admin/support/{id}/reply",Access.SIGNED_IN,c->booking.replySupport(c.user(),c.param(0),c.input(),true)).limited();
    r.post("/api/admin/support/{id}/decision",Access.SIGNED_IN,c->booking.decideChange(c.user(),c.param(0),c.input())).limited();
    r.post("/api/admin/reviews/{id}/reply",Access.SIGNED_IN,c->booking.replyReview(c.user(),c.param(0),c.input()));
    r.post("/api/admin/reviews/{id}/status",Access.SIGNED_IN,c->booking.moderateReview(c.user(),c.param(0),c.input()));
    return r;
  }
  private Object signIn(Call c,boolean register){
    String email=BookingService.text(c.input(),"email",254),password=secret(c.input(),"password");
    if(register&&auth.register(email,password,BookingService.text(c.input(),"displayName",80)).isEmpty())throw new Failure(400,"Email đã tồn tại hoặc thông tin đăng ký chưa hợp lệ.");
    var session=auth.login(email,password).orElseThrow(()->new Failure(401,"Email hoặc mật khẩu không đúng."));
    cookie(c.exchange(),session.token(),86400);return Map.of("user",session.user());
  }
  private static int days(String value){try{return Integer.parseInt(value);}catch(NumberFormatException e){throw new Failure(400,"Số ngày chưa hợp lệ.");}}
  private synchronized void rateLimit(HttpExchange x){
    long now=System.currentTimeMillis();
    attempts.entrySet().removeIf(e->e.getValue().isEmpty()||e.getValue().getLast()<now-60_000);
    var queue=attempts.computeIfAbsent(clientIp(x),key->new ArrayDeque<>());
    while(!queue.isEmpty()&&queue.getFirst()<now-60_000)queue.removeFirst();
    if(queue.size()>=20){x.getResponseHeaders().set("Retry-After","60");throw new Failure(429,"Thử lại sau một phút.");}
    queue.addLast(now);
  }
  /** Fixed one-minute window per client: blunts floods and scrapers without touching normal use. */
  private void throttle(HttpExchange x){
    long minute=System.currentTimeMillis()/60_000;
    var count=traffic.compute(clientIp(x),(ip,c)->c==null||c[0]!=minute?new long[]{minute,1}:new long[]{minute,c[1]+1});
    if(traffic.size()>50_000)traffic.entrySet().removeIf(e->e.getValue()[0]!=minute);
    if(count[1]>config.requestsPerMinute()){x.getResponseHeaders().set("Retry-After","60");throw new Failure(429,"Quá nhiều yêu cầu. Thử lại sau một phút.");}
  }
  /** Behind our own reverse proxy the socket address is the proxy, so the last X-Forwarded-For hop is the client. */
  private String clientIp(HttpExchange x){
    if(config.trustProxy()){String forwarded=x.getRequestHeaders().getFirst("X-Forwarded-For");
      if(forwarded!=null&&!forwarded.isBlank()){String[] hops=forwarded.split(",");return hops[hops.length-1].trim();}}
    return x.getRemoteAddress().getAddress().getHostAddress();
  }
  /** The page and the API on one origin (STAYOS_WEB_ROOT) need no CORS entry. */
  private boolean sameOrigin(HttpExchange x,String origin){
    if(config.webRoot()==null)return false;
    String host=x.getRequestHeaders().getFirst("Host");
    return host!=null&&(origin.equals("http://"+host)||origin.equals("https://"+host));
  }
  private String secret(JsonObject input,String field){
    var value=input.get(field);
    if(value==null||!value.isJsonPrimitive()||!value.getAsJsonPrimitive().isString()||value.getAsString().isEmpty()||value.getAsString().length()>256)throw new Failure(400,"Mật khẩu chưa hợp lệ.");
    return value.getAsString();
  }
  private Map<String,String> query(HttpExchange x){
    var result=new HashMap<String,String>();String raw=x.getRequestURI().getRawQuery();
    if(raw!=null)for(String pair:raw.split("&")){String[] p=pair.split("=",2);if(p.length==2)result.put(URLDecoder.decode(p[0],StandardCharsets.UTF_8),URLDecoder.decode(p[1],StandardCharsets.UTF_8));}
    return result;
  }
  private String token(HttpExchange x){
    String value=x.getRequestHeaders().getFirst("Cookie");
    if(value!=null)for(String part:value.split(";")){String[] pair=part.trim().split("=",2);if(pair.length==2&&pair[0].equals(sessionCookie))return pair[1].replace("\"","");}
    return null;
  }
  private void cookie(HttpExchange x,String value,int seconds){x.getResponseHeaders().add("Set-Cookie",sessionCookie+"="+value+"; HttpOnly; SameSite=Lax; Path=/api; Max-Age="+seconds+(config.secureCookie()?"; Secure":""));}
  private void send(HttpExchange x,int code,Object body)throws IOException{
    byte[] bytes=gson.toJson(body).getBytes(StandardCharsets.UTF_8);
    x.getResponseHeaders().set("Content-Type","application/json; charset=utf-8");x.getResponseHeaders().set("Cache-Control","no-store");x.getResponseHeaders().set("X-Content-Type-Options","nosniff");
    x.sendResponseHeaders(code,bytes.length);try(var out=x.getResponseBody()){out.write(bytes);}
  }
}
