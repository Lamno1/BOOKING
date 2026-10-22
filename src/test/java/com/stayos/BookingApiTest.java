package com.stayos;

import com.google.gson.*;
import com.stayos.auth.*;
import com.stayos.booking.BookingService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import java.net.*;
import java.net.http.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class BookingApiTest {
  @TempDir Path temp;
  AuthService auth; BookingService bookings; AuthServer server; String url;
  Gson json=new Gson();
  @BeforeEach void start() throws Exception {
    url="jdbc:sqlite:"+temp.resolve("test.sqlite");
    auth=new AuthService(url,"admin@example.test","test-admin-password",false);
    bookings=new BookingService(url);server=new AuthServer(auth,bookings,0);server.start();
  }
  @AfterEach void stop()throws Exception{if(server!=null)server.stop();if(bookings!=null)bookings.close();if(auth!=null)auth.close();}
  HttpClient client(){return HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).build();}
  HttpResponse<String> send(HttpClient client,String path,Object payload)throws Exception{
    var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+server.port()+"/api/"+path));
    if(payload!=null)request.header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(json.toJson(payload)));else request.GET();
    return client.send(request.build(),HttpResponse.BodyHandlers.ofString());
  }
  JsonObject body(HttpResponse<String> response){return JsonParser.parseString(response.body()).getAsJsonObject();}
  HttpClient guest(String email)throws Exception {
    var c=client();var r=send(c,"auth/register",Map.of("email",email,"password","test-guest-password","displayName","Guest \"One\"","role","admin"));
    assertEquals(201,r.statusCode());assertEquals("guest",body(r).getAsJsonObject("user").get("role").getAsString());return c;
  }
  String day(int n){return LocalDate.now(BookingService.ZONE).plusDays(n).toString();}
  Map<String,Object> booking(String room,int guests,long total,String key){
    var payload = new HashMap<String,Object>(Map.of("roomId",room,"guests",guests,"expectedTotal",total,"requestId",key,"arrival",day(1),"departure",day(3),"guestName","Visitor","email","visitor@example.test","addons",List.of()));
    payload.put("propertyId",Set.of("skyline","sunset","tidal","quiet","panorama","beach","atelier").contains(room)?"inn":"residence");
    payload.put("catalogVersion","two-properties-demo-v1");return payload;
  }
  @Test void isolationAuthorizationPricingHistoryAndPersistence()throws Exception{
    var a=guest("a@example.test");var b=guest("b@example.test");var admin=client();
    assertEquals(401,send(client(),"state",null).statusCode());
    assertEquals(403,send(a,"admin/state",null).statusCode());
    assertEquals(409,send(a,"bookings",booking("ocean",2,1,"cheap")).statusCode());
    assertEquals(400,send(a,"bookings",booking("ocean",6,1700000,"over-capacity")).statusCode());
    var payload=booking("panorama",6,1900000,"first");
    var created=send(a,"bookings",payload);assertEquals(201,created.statusCode());
    String id=body(created).get("id").getAsString();
    assertEquals(id,body(send(a,"bookings",payload)).get("id").getAsString());
    assertEquals(1,body(send(a,"state",null)).getAsJsonArray("bookings").size());
    assertEquals(0,body(send(b,"state",null)).getAsJsonArray("bookings").size());
    assertEquals(409,send(b,"bookings",booking("panorama",6,1900000,"conflict")).statusCode());
    assertEquals(404,send(b,"bookings/"+id+"/status",Map.of("status","CANCELLED")).statusCode());
    assertEquals(403,send(a,"bookings/"+id+"/status",Map.of("status","CHECKED_IN")).statusCode());
    long at=LocalDate.now(BookingService.ZONE).plusDays(1).atTime(18,0).atZone(BookingService.ZONE).toInstant().toEpochMilli();
    var service=Map.of("bookingId",id,"serviceId","spa","start",at);
    assertEquals(404,send(b,"services",service).statusCode());
    var requested=send(a,"services",service);assertEquals(201,requested.statusCode());
    String requestId=body(requested).get("id").getAsString();
    assertEquals(409,send(a,"services",service).statusCode());
    assertEquals(403,send(a,"services/"+requestId+"/confirm",Map.of()).statusCode());
    assertEquals(200,send(admin,"auth/login",Map.of("email","admin@example.test","password","test-admin-password")).statusCode());
    assertEquals(200,send(admin,"services/"+requestId+"/confirm",Map.of()).statusCode());
    var state=body(send(a,"state",null));
    assertEquals(3,state.getAsJsonArray("history").size());
    assertEquals("CONFIRMED",state.getAsJsonArray("requests").get(0).getAsJsonObject().get("status").getAsString());
    assertEquals(1,body(send(admin,"admin/state",null)).getAsJsonArray("bookings").size());
    assertEquals(0,body(send(admin,"state",null)).getAsJsonArray("bookings").size());
    try(var reopened=new BookingService(url)){assertEquals(1,reopened.state(new AuthService.User("a@example.test","guest","A"),false).getAsJsonArray("bookings").size());}
    assertEquals(200,send(a,"bookings/"+id+"/status",Map.of("status","CANCELLED")).statusCode());
    assertEquals(201,send(b,"bookings",booking("panorama",6,1900000,"retry")).statusCode());
    assertEquals("CANCELLED",body(send(a,"state",null)).getAsJsonArray("requests").get(0).getAsJsonObject().get("status").getAsString());
  }
  @Test void pastAndReversedDatesAreRejectedBeforeSaving()throws Exception{
    var c=guest("dates@example.test");
    for(var dates:List.of(List.of(day(-2),day(-1)),List.of(day(3),day(1)))){
      var payload=booking("ocean",2,1700000,"invalid-date-"+dates.get(0));
      payload.put("arrival",dates.get(0));payload.put("departure",dates.get(1));
      assertEquals(400,send(c,"bookings",payload).statusCode());
      assertEquals(400,send(c,"availability?arrival="+dates.get(0)+"&departure="+dates.get(1),null).statusCode());
    }
    assertEquals(0,body(send(c,"state",null)).getAsJsonArray("bookings").size());
  }
  @Test void catalogSnapshotsAndLegacyHistoryStayConsistent()throws Exception{
    var c=guest("snapshot@example.test");
    var inventory=body(send(c,"availability?arrival="+day(1)+"&departure="+day(3),null));
    assertEquals("two-properties-demo-v1",inventory.get("catalogVersion").getAsString());
    assertEquals(2,inventory.getAsJsonArray("properties").size());
    assertTrue(inventory.getAsJsonArray("properties").get(0).getAsJsonObject().get("address").isJsonNull());
    var wrong=booking("ocean",2,1700000,"wrong-property");wrong.put("propertyId","inn");
    assertEquals(400,send(c,"bookings",wrong).statusCode());
    var stale=booking("ocean",2,1700000,"stale");stale.remove("catalogVersion");
    assertEquals(409,send(c,"bookings",stale).statusCode());
    // A historical payload must not be rewritten when the catalog changes.
    String legacyPayload="{\"id\":\"LEGACY\",\"roomName\":\"Ocean View Apartment\",\"total\":4980000,\"status\":\"CANCELLED\"}";
    try(var db=DriverManager.getConnection(url);var s=db.prepareStatement("INSERT INTO stay_bookings VALUES(?,?,?,?,?,?,?,?)")){
      s.setString(1,"LEGACY");s.setString(2,"snapshot@example.test");s.setString(3,"ocean");s.setString(4,day(1));s.setString(5,day(3));s.setString(6,"CANCELLED");s.setString(7,"legacy");s.setString(8,legacyPayload);s.executeUpdate();
    }
    for(var entry:inventory.getAsJsonArray("rooms")){
      var room=entry.getAsJsonObject();String roomId=room.get("id").getAsString();
      var response=send(c,"bookings",booking(roomId,2,room.get("price").getAsLong()*2,roomId));
      assertEquals(201,response.statusCode(),response.body());var saved=body(response);
      assertEquals(room.get("name"),saved.get("roomName"));assertEquals(room.get("price"),saved.get("nightlyRate"));
      assertEquals(room.get("propertyId"),saved.get("propertyId"));
      for(String field:List.of("id","name","number","area","capacity","beds","bedrooms","features","price","propertyId"))
        assertEquals(room.get(field),saved.getAsJsonObject("roomSnapshot").get(field),roomId+" "+field);
      assertEquals(0,saved.get("deposit").getAsInt());assertTrue(saved.get("taxIncluded").getAsBoolean());
    }
    var persisted=body(send(c,"state",null)).getAsJsonArray("bookings");
    assertEquals(16,persisted.size());assertEquals(JsonParser.parseString(legacyPayload),persisted.get(0));
    try(var reopened=new BookingService(url)){
      assertEquals(JsonParser.parseString(legacyPayload),reopened.state(new AuthService.User("snapshot@example.test","guest","S"),false).getAsJsonArray("bookings").get(0));
    }
  }
  @Test void concurrentRequestsCannotDoubleBook()throws Exception{
    var a=guest("a@example.test");var b=guest("b@example.test");
    try(var executor=Executors.newFixedThreadPool(2)){
      var gate=new CountDownLatch(1);
      var first=executor.submit(()->{gate.await();return send(a,"bookings",booking("ocean",2,1700000,"a")).statusCode();});
      var second=executor.submit(()->{gate.await();return send(b,"bookings",booking("ocean",2,1700000,"b")).statusCode();});
      gate.countDown();assertEquals(Set.of(201,409),Set.of(first.get(),second.get()));
    }
  }
  @Test void passwordsJsonSessionsAndOrigin()throws Exception{
    var c=client();String password=" spaces \\ \" newline\n ";
    assertEquals(201,send(c,"auth/register",Map.of("email","escaped@example.test","password",password,"displayName","Nguyễn \"Thông\"")).statusCode());
    assertEquals(200,send(c,"auth/logout",Map.of()).statusCode());
    assertEquals(401,send(c,"auth/me",null).statusCode());
    assertEquals(401,send(c,"auth/login",Map.of("email","escaped@example.test","password","wrong-password")).statusCode());
    assertEquals(200,send(c,"auth/login",Map.of("email","escaped@example.test","password",password)).statusCode());
    var other=client();send(other,"auth/login",Map.of("email","escaped@example.test","password",password));
    assertEquals(200,send(c,"auth/password",Map.of("currentPassword",password,"newPassword","new-long-password")).statusCode());
    assertEquals(401,send(other,"auth/me",null).statusCode());
    assertEquals(401,send(c,"auth/me",null).statusCode());
    var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+server.port()+"/api/auth/login"))
      .header("Origin","https://evil.example").header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{}")).build();
    assertEquals(403,c.send(request,HttpResponse.BodyHandlers.ofString()).statusCode());
    var badJson=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+server.port()+"/api/auth/login"))
      .header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{broken")).build();
    assertEquals(400,c.send(badJson,HttpResponse.BodyHandlers.ofString()).statusCode());
  }
  @Test void adminAccountAndRoomOperationsAreEnforced()throws Exception{
    var guest=guest("managed@example.test");var admin=client();
    send(admin,"auth/login",Map.of("email","admin@example.test","password","test-admin-password"));
    assertEquals(403,send(guest,"admin/users",null).statusCode());
    assertEquals(403,send(guest,"admin/users/status",Map.of("email","managed@example.test","status","SUSPENDED")).statusCode());
    var users=send(admin,"admin/users",null);assertEquals(200,users.statusCode());assertFalse(users.body().contains("password_hash"));
    assertEquals(403,send(admin,"admin/users/status",Map.of("email","admin@example.test","status","SUSPENDED")).statusCode());
    assertEquals(200,send(admin,"admin/users/status",Map.of("email","managed@example.test","status","SUSPENDED")).statusCode());
    assertEquals(401,send(guest,"state",null).statusCode());
    assertEquals(401,send(guest,"auth/login",Map.of("email","managed@example.test","password","test-guest-password")).statusCode());
    assertEquals(200,send(admin,"admin/users/status",Map.of("email","managed@example.test","status","ACTIVE")).statusCode());
    assertEquals(200,send(guest,"auth/login",Map.of("email","managed@example.test","password","test-guest-password")).statusCode());
    var buyer=guest("buyer@example.test");
    var closed=Map.of("roomId","ocean","status","MAINTENANCE","note","Fixture maintenance");
    assertEquals(403,send(buyer,"admin/rooms/status",closed).statusCode());
    assertEquals(200,send(admin,"admin/rooms/status",closed).statusCode());
    var dates=booking("ocean",2,1700000,"blocked");
    String query="?arrival="+dates.get("arrival")+"&departure="+dates.get("departure");
    var inventory=body(send(admin,"admin/rooms"+query,null));
    assertFalse(inventory.getAsJsonArray("rooms").get(0).getAsJsonObject().get("available").getAsBoolean());
    assertEquals(409,send(buyer,"bookings",dates).statusCode());
    assertEquals(200,send(admin,"admin/rooms/status",Map.of("roomId","ocean","status","OPEN","note","Ready")).statusCode());
    assertEquals(201,send(buyer,"bookings",dates).statusCode());
    assertFalse(body(send(admin,"admin/rooms"+query,null)).getAsJsonArray("rooms").get(0).getAsJsonObject().get("available").getAsBoolean());
    try(var reopened=new AuthService(url,"admin@example.test",null,false)){
      assertEquals("ACTIVE",reopened.users(new AuthService.User("admin@example.test","admin","Admin")).stream().filter(u->u.get("email").equals("managed@example.test")).findFirst().orElseThrow().get("status"));
    }
  }
  @Test void supportIsPrivateIdempotentAndStaffCanResolveWithoutCharging()throws Exception{
    var guest=guest("support@example.test");var other=guest("outsider@example.test");var admin=client();
    send(admin,"auth/login",Map.of("email","admin@example.test","password","test-admin-password"));
    String id=body(send(guest,"bookings",booking("ocean",2,1700000,"support-booking"))).get("id").getAsString();
    var input=Map.of("bookingId",id,"kind","TOWELS","message","Tôi cần thêm khăn và hỏi Wi-Fi","requestId","support-key");
    assertEquals(404,send(other,"support",input).statusCode());
    var created=send(guest,"support",input);assertEquals(201,created.statusCode(),created.body());String ticket=body(created).get("id").getAsString();
    assertEquals(ticket,body(send(guest,"support",input)).get("id").getAsString());
    assertEquals(1,body(send(guest,"state",null)).getAsJsonArray("support").size());assertEquals(0,body(send(other,"state",null)).getAsJsonArray("support").size());
    assertEquals(403,send(guest,"admin/support/"+ticket+"/reply",Map.of("message","Fake staff","status","RESOLVED")).statusCode());
    assertEquals(404,send(other,"support/"+ticket+"/messages",Map.of("message","Not mine")).statusCode());
    assertEquals(200,send(admin,"admin/support/"+ticket+"/reply",Map.of("message","Đã tiếp nhận, cần mấy khăn?","status","IN_PROGRESS")).statusCode());
    assertEquals(200,send(guest,"support/"+ticket+"/messages",Map.of("message","2 khăn nhé","status","RESOLVED")).statusCode());
    assertEquals("IN_PROGRESS",body(send(guest,"state",null)).getAsJsonArray("support").get(0).getAsJsonObject().get("status").getAsString());
    assertEquals(400,send(admin,"admin/support/"+ticket+"/reply",Map.of("message","Mới ghi nhận","status","RESOLVED")).statusCode());
    assertEquals(200,send(admin,"admin/support/"+ticket+"/reply",Map.of("message","Đã bàn giao 2 khăn và cung cấp Wi-Fi","status","RESOLVED","completionConfirmed",true)).statusCode());
    assertEquals(409,send(guest,"support/"+ticket+"/messages",Map.of("message","Too late")).statusCode());
    var saved=body(send(guest,"state",null));assertEquals(1700000,saved.getAsJsonArray("bookings").get(0).getAsJsonObject().get("total").getAsLong());assertEquals(0,saved.getAsJsonArray("requests").size());
    try(var reopened=new BookingService(url)){assertEquals(4,reopened.state(new AuthService.User("support@example.test","guest","Guest"),false).getAsJsonArray("support").get(0).getAsJsonObject().getAsJsonArray("messages").size());}
  }
  @Test void dateChangeApprovalRechecksInventoryAndPreservesOriginalSnapshot()throws Exception{
    var guest=guest("changes@example.test");var other=guest("competitor@example.test");var admin=client();
    send(admin,"auth/login",Map.of("email","admin@example.test","password","test-admin-password"));
    var original=body(send(guest,"bookings",booking("ocean",2,1700000,"original")));String id=original.get("id").getAsString();
    var dates=Map.of("arrival",day(2),"departure",day(4));var preview=send(guest,"bookings/"+id+"/change-quote",dates);assertEquals(200,preview.statusCode(),preview.body());
    assertEquals(404,send(other,"bookings/"+id+"/change-quote",dates).statusCode());
    var input=new HashMap<String,Object>(Map.of("bookingId",id,"kind","DATE_CHANGE","message","Xin đổi lịch","requestId","change-1","arrival",day(2),"departure",day(4),"expectedTotal",1700000,"expectedCurrentTotal",1700000));
    var requested=send(guest,"support",input);assertEquals(201,requested.statusCode(),requested.body());String ticket=body(requested).get("id").getAsString();
    assertEquals(original,body(send(guest,"state",null)).getAsJsonArray("bookings").get(0));
    input.put("requestId","duplicate-open");assertEquals(409,send(guest,"support",input).statusCode());
    var competitor=booking("ocean",2,1700000,"compete");competitor.put("arrival",day(3));competitor.put("departure",day(5));
    var conflict=send(other,"bookings",competitor);assertEquals(201,conflict.statusCode(),conflict.body());String conflictId=body(conflict).get("id").getAsString();
    var approval=Map.of("decision","APPROVED","message","Đã kiểm tra phòng trống");
    assertEquals(403,send(guest,"admin/support/"+ticket+"/decision",approval).statusCode());
    assertEquals(409,send(admin,"admin/support/"+ticket+"/decision",approval).statusCode());
    assertEquals(original,body(send(guest,"state",null)).getAsJsonArray("bookings").get(0));
    assertEquals(200,send(other,"bookings/"+conflictId+"/status",Map.of("status","CANCELLED")).statusCode());
    assertEquals(200,send(admin,"admin/support/"+ticket+"/decision",approval).statusCode());
    var changed=body(send(guest,"state",null)).getAsJsonArray("bookings").get(0).getAsJsonObject();
    assertEquals(day(2),changed.get("arrival").getAsString());assertEquals(day(4),changed.get("departure").getAsString());assertEquals(original.get("roomSnapshot"),changed.get("roomSnapshot"));assertEquals(original.get("policy"),changed.get("policy"));
    assertEquals(day(1),changed.getAsJsonObject("initialStay").get("arrival").getAsString());assertEquals(1,changed.getAsJsonArray("changes").size());
    assertEquals(409,send(admin,"admin/support/"+ticket+"/decision",approval).statusCode());
  }
  @Test void changedPriceAndServiceDatesCannotBeSilentlyAccepted()throws Exception{
    var guest=guest("service-change@example.test");var admin=client();send(admin,"auth/login",Map.of("email","admin@example.test","password","test-admin-password"));
    String id=body(send(guest,"bookings",booking("ocean",2,1700000,"service-change"))).get("id").getAsString();
    var input=Map.of("bookingId",id,"kind","DATE_CHANGE","message","Xin thêm một đêm","requestId","change-price","arrival",day(1),"departure",day(4),"expectedTotal",2550000,"expectedCurrentTotal",1700000);
    String ticket=body(send(guest,"support",input)).get("id").getAsString();
    long appointment=LocalDate.now(BookingService.ZONE).plusDays(1).atTime(18,0).atZone(BookingService.ZONE).toInstant().toEpochMilli();
    assertEquals(201,send(guest,"services",Map.of("bookingId",id,"serviceId","spa","start",appointment)).statusCode());
    assertEquals(409,send(admin,"admin/support/"+ticket+"/decision",Map.of("decision","APPROVED","message","Stale total")).statusCode());
    var outside=send(guest,"bookings/"+id+"/change-quote",Map.of("arrival",day(2),"departure",day(4)));assertEquals(409,outside.statusCode());
    assertEquals(200,send(admin,"admin/support/"+ticket+"/decision",Map.of("decision","DECLINED","message","Vui lòng kiểm tra lại lịch dịch vụ và giá mới")).statusCode());
    var saved=body(send(guest,"state",null));assertEquals(day(1),saved.getAsJsonArray("bookings").get(0).getAsJsonObject().get("arrival").getAsString());assertEquals(2250000,saved.getAsJsonArray("bookings").get(0).getAsJsonObject().get("total").getAsLong());
  }
  @Test void cancellingBookingClosesSupportButKeepsMessagesAndHistory()throws Exception{
    var guest=guest("cancel-support@example.test");String id=body(send(guest,"bookings",booking("ocean",2,1700000,"cancel-support"))).get("id").getAsString();
    var input=Map.of("bookingId",id,"kind","WIFI","message","Tôi cần Wi-Fi","requestId","wifi-key");String ticket=body(send(guest,"support",input)).get("id").getAsString();
    assertEquals(200,send(guest,"bookings/"+id+"/status",Map.of("status","CANCELLED")).statusCode());
    var support=body(send(guest,"state",null)).getAsJsonArray("support").get(0).getAsJsonObject();assertEquals("CANCELLED",support.get("status").getAsString());assertEquals(1,support.getAsJsonArray("messages").size());
    assertEquals(409,send(guest,"support/"+ticket+"/messages",Map.of("message","Late message")).statusCode());
    assertEquals(409,send(guest,"support",Map.of("bookingId",id,"kind","WIFI","message","Again","requestId","new-key")).statusCode());
    assertEquals(3,body(send(guest,"state",null)).getAsJsonArray("history").size());
  }
  @Test void inquiryNeedsNoBookingAndCancelledStayCanAskAftercare()throws Exception{
    var guest=guest("question@example.test");var other=guest("unrelated@example.test");
    var input=Map.of("bookingId","INQUIRY","propertyId","inn","kind","INQUIRY","message","Tôi chưa đặt, có thể hỏi về chính sách không?","requestId","before-booking");
    assertEquals(401,send(client(),"support",input).statusCode());
    var response=send(guest,"support",input);assertEquals(201,response.statusCode(),response.body());String ticket=body(response).get("id").getAsString();
    assertEquals("inn",body(response).get("propertyId").getAsString());assertEquals(0,body(send(guest,"state",null)).getAsJsonArray("bookings").size());
    assertEquals(404,send(other,"support/"+ticket+"/messages",Map.of("message","Not mine")).statusCode());
    String id=body(send(guest,"bookings",booking("ocean",2,1700000,"aftercare"))).get("id").getAsString();
    assertEquals(200,send(guest,"bookings/"+id+"/status",Map.of("status","CANCELLED")).statusCode());
    assertEquals(201,send(guest,"support",Map.of("bookingId",id,"kind","OTHER","message","Hỏi thông tin đơn sau hủy","requestId","after-cancel")).statusCode());
    assertEquals(409,send(guest,"support",Map.of("bookingId",id,"kind","TOWELS","message","Khăn cho đơn đã hủy","requestId","wrong-kind")).statusCode());
  }
  @Test void demoOfferIsServerPricedScheduledAndPreservedWithBenefits()throws Exception{
    var guest=guest("package@example.test");var input=booking("tidal",4,3280000,"offer-one");
    input.put("offerVersion","review-02.1-2026-10-17");input.put("planId","breakfast");input.put("demoAcknowledged",true);input.put("quantities",Map.of("dining",2));input.put("schedules",Map.of("dining",Map.of("date",day(2),"time","18:00")));
    input.put("expectedTotal",1);assertEquals(409,send(guest,"bookings",input).statusCode());
    input.put("expectedTotal",3280000);input.put("schedules",Map.of("dining",Map.of("date",day(2),"time","10:00")));assertEquals(400,send(guest,"bookings",input).statusCode());
    input.put("schedules",Map.of("dining",Map.of("date",day(2),"time","18:00")));input.put("demoAcknowledged",false);assertEquals(400,send(guest,"bookings",input).statusCode());input.put("demoAcknowledged",true);
    var response=send(guest,"bookings",input);assertEquals(201,response.statusCode(),response.body());var b=body(response);String id=b.get("id").getAsString();assertEquals(3280000,b.get("total").getAsLong());assertEquals(480000,b.get("packageSupplement").getAsLong());assertEquals(8,b.getAsJsonObject("offerSnapshot").getAsJsonArray("benefits").get(1).getAsJsonObject().get("quantity").getAsInt());
    assertEquals(id,body(send(guest,"bookings",input)).get("id").getAsString());var state=body(send(guest,"state",null));assertEquals(1,state.getAsJsonArray("requests").size());var service=state.getAsJsonArray("requests").get(0).getAsJsonObject();assertEquals(2,service.get("quantity").getAsInt());assertEquals(1300000,service.get("price").getAsLong());assertTrue(service.has("start"));assertTrue(service.has("conditions"));
    assertEquals(200,send(guest,"bookings/"+id+"/status",Map.of("status","CANCELLED")).statusCode());
    try(var reopened=new BookingService(url)){var saved=reopened.state(new AuthService.User("package@example.test","guest","Guest"),false).getAsJsonArray("bookings").get(0).getAsJsonObject();assertEquals("CANCELLED",saved.get("status").getAsString());assertEquals(3280000,saved.get("total").getAsLong());assertEquals(8,saved.getAsJsonObject("offerSnapshot").getAsJsonArray("benefits").get(1).getAsJsonObject().get("quantity").getAsInt());}
  }
  @Test void packageDateChangeReratesFromSavedPlanAndKeepsServices()throws Exception{
    var guest=guest("package-change@example.test");var admin=client();send(admin,"auth/login",Map.of("email","admin@example.test","password","test-admin-password"));
    var input=booking("tidal",4,3280000,"package-change");
    input.put("offerVersion","review-02.1-2026-10-17");input.put("planId","breakfast");input.put("demoAcknowledged",true);input.put("quantities",Map.of("dining",2));input.put("schedules",Map.of("dining",Map.of("date",day(2),"time","18:00")));
    var created=send(guest,"bookings",input);assertEquals(201,created.statusCode(),created.body());String id=body(created).get("id").getAsString();
    var quote=body(send(guest,"bookings/"+id+"/change-quote",Map.of("arrival",day(1),"departure",day(4))));
    assertEquals(2250000,quote.get("roomTotal").getAsLong());assertEquals(720000,quote.get("packageSupplement").getAsLong());assertEquals(480000,quote.get("currentPackageSupplement").getAsLong());
    assertEquals(1300000,quote.get("serviceTotal").getAsLong());assertEquals(4270000,quote.get("total").getAsLong());assertEquals(12,quote.getAsJsonArray("benefits").get(1).getAsJsonObject().get("quantity").getAsInt());
    assertEquals(409,send(guest,"bookings/"+id+"/change-quote",Map.of("arrival",day(3),"departure",day(5))).statusCode());
    var request=Map.of("bookingId",id,"kind","DATE_CHANGE","message","Thêm một đêm","requestId","package-extend","arrival",day(1),"departure",day(4),"expectedTotal",4270000,"expectedCurrentTotal",3280000);
    var ticket=send(guest,"support",request);assertEquals(201,ticket.statusCode(),ticket.body());
    assertEquals(200,send(admin,"admin/support/"+body(ticket).get("id").getAsString()+"/decision",Map.of("decision","APPROVED","message","Đã kiểm tra bếp và phòng")).statusCode());
    var saved=body(send(guest,"state",null)).getAsJsonArray("bookings").get(0).getAsJsonObject();var offer=saved.getAsJsonObject("offerSnapshot");
    assertEquals(4270000,saved.get("total").getAsLong());assertEquals(720000,saved.get("packageSupplement").getAsLong());assertEquals(12,offer.getAsJsonArray("benefits").get(1).getAsJsonObject().get("quantity").getAsInt());
    assertEquals(480000,saved.getAsJsonObject("initialStay").get("packageSupplement").getAsLong());assertEquals(8,saved.getAsJsonObject("initialStay").getAsJsonArray("benefits").get(1).getAsJsonObject().get("quantity").getAsInt());
    assertEquals(1300000,body(send(guest,"state",null)).getAsJsonArray("requests").get(0).getAsJsonObject().get("price").getAsLong());
  }
  @Test void packageServiceDurationMustFitTheNewCheckout()throws Exception{
    var guest=guest("package-spa@example.test");var input=booking("tidal",2,1500000,"package-spa");
    input.put("offerVersion","review-02.1-2026-10-17");input.put("planId","welcome");input.put("demoAcknowledged",true);input.put("quantities",Map.of("spa",1));input.put("schedules",Map.of("spa",Map.of("date",day(2),"time","11:30")));
    long price=0;for(var addon:JsonParser.parseString(new String(BookingService.class.getResourceAsStream("/web/review/offer-v2.json").readAllBytes(),java.nio.charset.StandardCharsets.UTF_8)).getAsJsonObject().getAsJsonArray("addons"))if(addon.getAsJsonObject().get("id").getAsString().equals("spa"))price=addon.getAsJsonObject().get("price").getAsLong();
    input.put("expectedTotal",1500000+price);var created=send(guest,"bookings",input);assertEquals(201,created.statusCode(),created.body());String id=body(created).get("id").getAsString();
    var shorter=send(guest,"bookings/"+id+"/change-quote",Map.of("arrival",day(1),"departure",day(2)));assertEquals(409,shorter.statusCode(),shorter.body());assertTrue(shorter.body().contains("ngoài ngày ở mới"));
    assertEquals(200,send(guest,"bookings/"+id+"/change-quote",Map.of("arrival",day(1),"departure",day(4))).statusCode());
  }
  @Test void packageBookingAddsServicesFromOfferCatalogWithQuantitiesAndWindows()throws Exception{
    var guest=guest("package-addon@example.test");var other=guest("package-intruder@example.test");var input=booking("tidal",4,1500000,"package-addon");
    input.put("offerVersion","review-02.1-2026-10-17");input.put("planId","welcome");input.put("demoAcknowledged",true);
    var created=send(guest,"bookings",input);assertEquals(201,created.statusCode(),created.body());String id=body(created).get("id").getAsString();
    long legacyStart=LocalDate.now(BookingService.ZONE).plusDays(2).atTime(18,0).atZone(BookingService.ZONE).toInstant().toEpochMilli();
    assertEquals(409,send(guest,"services",Map.of("bookingId",id,"serviceId","spa","start",legacyStart)).statusCode());
    var dinner=new HashMap<String,Object>(Map.of("bookingId",id,"offerVersion","review-02.1-2026-10-17","serviceId","dining","quantity",2,"schedule",Map.of("date",day(2),"time","18:30"),"expectedPrice",1300000));
    assertEquals(404,send(other,"services",dinner).statusCode());
    dinner.put("expectedPrice",650000);assertEquals(409,send(guest,"services",dinner).statusCode());dinner.put("expectedPrice",1300000);
    dinner.put("schedule",Map.of("date",day(2),"time","21:00"));assertEquals(400,send(guest,"services",dinner).statusCode());
    dinner.put("schedule",Map.of("date",day(5),"time","18:30"));assertEquals(400,send(guest,"services",dinner).statusCode());
    dinner.put("offerVersion","old");assertEquals(409,send(guest,"services",dinner).statusCode());dinner.put("offerVersion","review-02.1-2026-10-17");
    dinner.put("schedule",Map.of("date",day(2),"time","18:30"));var added=send(guest,"services",dinner);assertEquals(201,added.statusCode(),added.body());
    assertEquals(2,body(added).get("quantity").getAsInt());assertEquals(1300000,body(added).get("price").getAsLong());
    assertEquals(409,send(guest,"services",dinner).statusCode());
    var saved=body(send(guest,"state",null));assertEquals(2800000,saved.getAsJsonArray("bookings").get(0).getAsJsonObject().get("total").getAsLong());assertEquals(1,saved.getAsJsonArray("requests").size());
    var quote=body(send(guest,"bookings/"+id+"/change-quote",Map.of("arrival",day(1),"departure",day(4))));assertEquals(1300000,quote.get("serviceTotal").getAsLong());assertEquals(3550000,quote.get("total").getAsLong());
    String request=body(added).get("id").getAsString();
    assertEquals(404,send(other,"services/"+request+"/cancel",Map.of()).statusCode());
    var cancelled=send(guest,"services/"+request+"/cancel",Map.of());assertEquals(200,cancelled.statusCode(),cancelled.body());assertEquals("CANCELLED",body(cancelled).get("status").getAsString());
    assertEquals(200,send(guest,"services/"+request+"/cancel",Map.of()).statusCode());
    var after=body(send(guest,"state",null));assertEquals(1500000,after.getAsJsonArray("bookings").get(0).getAsJsonObject().get("total").getAsLong());
    assertTrue(after.getAsJsonArray("history").toString().contains("SERVICE_CANCELLED"));
    assertEquals(201,send(guest,"services",dinner).statusCode());
  }
  @Test void arrivalChangeMovesPickupOnlyWithNewFlightAndNeedsReconfirmation()throws Exception{
    var guest=guest("package-transfer@example.test");var admin=client();send(admin,"auth/login",Map.of("email","admin@example.test","password","test-admin-password"));
    var input=booking("tidal",4,2350000,"package-transfer");input.put("arrival",day(2));input.put("departure",day(4));
    input.put("offerVersion","review-02.1-2026-10-17");input.put("planId","welcome");input.put("demoAcknowledged",true);input.put("quantities",Map.of("transfer",1));input.put("schedules",Map.of("transfer",Map.of("date",day(2),"time","10:00","flight","VN123")));
    var created=send(guest,"bookings",input);assertEquals(201,created.statusCode(),created.body());String id=body(created).get("id").getAsString();
    var dates=new HashMap<String,Object>(Map.of("arrival",day(3),"departure",day(5)));
    var missing=send(guest,"bookings/"+id+"/change-quote",dates);assertEquals(409,missing.statusCode());assertTrue(missing.body().contains("chuyến bay mới"));
    dates.put("transfer",Map.of("time","11:00","flight","bad"));assertEquals(400,send(guest,"bookings/"+id+"/change-quote",dates).statusCode());
    dates.put("transfer",Map.of("time","11:00","flight","VN456"));var quote=send(guest,"bookings/"+id+"/change-quote",dates);assertEquals(200,quote.statusCode(),quote.body());
    assertEquals(2350000,body(quote).get("total").getAsLong());assertEquals("VN456",body(quote).getAsJsonObject("transferChange").getAsJsonObject("schedule").get("flight").getAsString());
    var request=new HashMap<String,Object>(dates);request.putAll(Map.of("bookingId",id,"kind","DATE_CHANGE","message","Đổi chuyến bay","requestId","transfer-change","expectedTotal",2350000,"expectedCurrentTotal",2350000));
    var ticket=send(guest,"support",request);assertEquals(201,ticket.statusCode(),ticket.body());
    String serviceId=body(send(guest,"state",null)).getAsJsonArray("requests").get(0).getAsJsonObject().get("id").getAsString();
    assertEquals(200,send(admin,"services/"+serviceId+"/confirm",Map.of()).statusCode());
    assertEquals(200,send(admin,"admin/support/"+body(ticket).get("id").getAsString()+"/decision",Map.of("decision","APPROVED","message","Đã đổi lịch xe")).statusCode());
    var state=body(send(guest,"state",null));var pickup=state.getAsJsonArray("requests").get(0).getAsJsonObject();
    assertEquals(day(3),state.getAsJsonArray("bookings").get(0).getAsJsonObject().get("arrival").getAsString());
    assertEquals(LocalDate.now(BookingService.ZONE).plusDays(3).atTime(11,0).atZone(BookingService.ZONE).toInstant().toEpochMilli(),pickup.get("start").getAsLong());
    assertEquals("VN456",pickup.getAsJsonObject("requestedSchedule").get("flight").getAsString());assertEquals("PENDING",pickup.get("status").getAsString());assertEquals(850000,pickup.get("price").getAsLong());
    assertEquals("VN123",state.getAsJsonArray("bookings").get(0).getAsJsonObject().getAsJsonArray("changes").get(0).getAsJsonObject().getAsJsonObject("transferChange").getAsJsonObject("previousSchedule").get("flight").getAsString());
  }
  @Test void roomCalendarShowsOccupiedNightsWithoutGuestDetails()throws Exception{
    var guest=guest("calendar@example.test");String id=body(send(guest,"bookings",booking("ocean",2,1700000,"calendar"))).get("id").getAsString();
    var anonymous=client();var response=send(anonymous,"rooms/ocean/calendar?from="+day(0)+"&days=7",null);assertEquals(200,response.statusCode(),response.body());
    var nights=body(response).getAsJsonArray("bookedNights");assertEquals(2,nights.size());assertEquals(day(1),nights.get(0).getAsString());assertEquals(day(2),nights.get(1).getAsString());
    assertFalse(response.body().contains("calendar@example.test"));assertFalse(response.body().contains(id));assertTrue(body(response).get("open").getAsBoolean());
    assertEquals(0,body(send(anonymous,"rooms/suite/calendar?from="+day(0)+"&days=7",null)).getAsJsonArray("bookedNights").size());
    assertEquals(400,send(anonymous,"rooms/ocean/calendar?from="+day(-1)+"&days=7",null).statusCode());
    assertEquals(400,send(anonymous,"rooms/ocean/calendar?from="+day(0)+"&days=500",null).statusCode());
    assertEquals(400,send(anonymous,"rooms/unknown/calendar?from="+day(0)+"&days=7",null).statusCode());
    assertEquals(200,send(guest,"bookings/"+id+"/status",Map.of("status","CANCELLED")).statusCode());
    assertEquals(0,body(send(anonymous,"rooms/ocean/calendar?from="+day(0)+"&days=7",null)).getAsJsonArray("bookedNights").size());
  }
  @Test void onlyCheckedOutGuestsReviewOncePubliclyWithoutPrivateDataAndStaffCanHide()throws Exception{
    var guest=guest("reviewer@example.test");var other=guest("not-reviewer@example.test");var admin=client();send(admin,"auth/login",Map.of("email","admin@example.test","password","test-admin-password"));
    var input=booking("ocean",2,1700000,"review-stay");input.put("arrival",day(0));input.put("departure",day(2));
    String id=body(send(guest,"bookings",input)).get("id").getAsString();
    var review=new HashMap<String,Object>(Map.of("bookingId",id,"rating",5,"comment","Phòng sạch, nhân viên hỗ trợ nhanh."));
    assertEquals(409,send(guest,"reviews",review).statusCode());
    assertEquals(200,send(admin,"bookings/"+id+"/status",Map.of("status","CHECKED_IN")).statusCode());
    assertEquals(200,send(admin,"bookings/"+id+"/status",Map.of("status","CHECKED_OUT")).statusCode());
    assertEquals(404,send(other,"reviews",review).statusCode());
    review.put("rating",6);assertEquals(400,send(guest,"reviews",review).statusCode());review.put("rating",5);
    var created=send(guest,"reviews",review);assertEquals(201,created.statusCode(),created.body());String reviewId=body(created).get("id").getAsString();
    assertEquals("Guest",body(created).get("author").getAsString());
    assertEquals(409,send(guest,"reviews",review).statusCode());
    var pub=send(client(),"rooms/ocean/reviews",null);assertEquals(200,pub.statusCode());
    assertEquals(1,body(pub).get("count").getAsInt());assertEquals(5.0,body(pub).get("average").getAsDouble());
    assertFalse(pub.body().contains("reviewer@example.test"));assertFalse(pub.body().contains(id));
    assertEquals(5.0,body(send(client(),"reviews/summary",null)).getAsJsonObject("ocean").get("average").getAsDouble());
    assertEquals(1,body(send(guest,"state",null)).getAsJsonArray("reviews").size());assertEquals(0,body(send(other,"state",null)).getAsJsonArray("reviews").size());
    assertEquals(403,send(guest,"admin/reviews/"+reviewId+"/reply",Map.of("reply","Tự trả lời")).statusCode());
    assertEquals(200,send(admin,"admin/reviews/"+reviewId+"/reply",Map.of("reply","Cảm ơn bạn đã chọn STAYOS.")).statusCode());
    var replied=body(send(client(),"rooms/ocean/reviews",null)).getAsJsonArray("reviews").get(0).getAsJsonObject();
    assertEquals("Cảm ơn bạn đã chọn STAYOS.",replied.getAsJsonObject("reply").get("text").getAsString());assertEquals("Phòng sạch, nhân viên hỗ trợ nhanh.",replied.get("comment").getAsString());
    assertEquals(403,send(guest,"admin/reviews/"+reviewId+"/status",Map.of("status","HIDDEN","reason","Tự ẩn")).statusCode());
    assertEquals(200,send(admin,"admin/reviews/"+reviewId+"/status",Map.of("status","HIDDEN","reason","Chứa thông tin cá nhân")).statusCode());
    assertEquals(0,body(send(client(),"rooms/ocean/reviews",null)).get("count").getAsInt());assertFalse(body(send(client(),"reviews/summary",null)).has("ocean"));
    assertEquals("HIDDEN",body(send(guest,"state",null)).getAsJsonArray("reviews").get(0).getAsJsonObject().get("status").getAsString());
  }
  @Test void savedRoomsFollowTheAccountAndStayPrivate()throws Exception{
    var guest=guest("wishlist@example.test");var other=guest("wishlist-other@example.test");
    assertEquals(401,send(client(),"saved",null).statusCode());
    assertEquals(200,send(guest,"saved",Map.of("roomId","ocean","saved",true)).statusCode());
    assertEquals(200,send(guest,"saved",Map.of("roomId","ocean","saved",true)).statusCode());
    var list=body(send(guest,"saved",Map.of("roomId","tidal","saved",true))).getAsJsonArray("rooms");assertEquals(2,list.size());
    assertEquals(0,body(send(other,"saved",null)).getAsJsonArray("rooms").size());
    assertEquals(400,send(guest,"saved",Map.of("roomId","unknown","saved",true)).statusCode());
    assertEquals(400,send(guest,"saved",Map.of("roomId","ocean")).statusCode());
    assertEquals(1,body(send(guest,"saved",Map.of("roomId","ocean","saved",false))).getAsJsonArray("rooms").size());
    assertEquals("tidal",body(send(guest,"saved",null)).getAsJsonArray("rooms").get(0).getAsString());
  }
  @Test void legacyPlaintextColumnIsRemovedAndRegistrationWorks()throws Exception{
    String legacy="jdbc:sqlite:"+temp.resolve("legacy.sqlite");
    try(var db=DriverManager.getConnection(legacy);var s=db.createStatement()){
      s.execute("CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL)");
      s.execute("INSERT INTO users VALUES(1,'old@example.test','legacy-secret','guest')");
    }
    try(var migrated=new AuthService(legacy,"unused@example.test",null,false)){
      assertTrue(migrated.login("old@example.test","legacy-secret").isPresent());
      assertTrue(migrated.register("new@example.test","new-password","New user").isPresent());
      try(var db=DriverManager.getConnection(legacy);var s=db.createStatement();var r=s.executeQuery("PRAGMA table_info(users)")){
        while(r.next())assertNotEquals("password",r.getString("name"));
      }
    }
  }
  @Test void arrivalWindowAndSpecialRequestsAreValidatedEditableUntilCheckInAndPrivate()throws Exception{
    var guest=guest("eta@example.test");var other=guest("eta-other@example.test");var admin=client();send(admin,"auth/login",Map.of("email","admin@example.test","password","test-admin-password"));
    var input=booking("ocean",2,1700000,"eta-stay");input.put("arrival",day(0));input.put("departure",day(2));
    input.put("arrivalWindow","25-26");assertEquals(400,send(guest,"bookings",input).statusCode());
    input.put("arrivalWindow","20-22");input.put("specialRequests","x".repeat(301));assertEquals(400,send(guest,"bookings",input).statusCode());
    input.put("specialRequests","  Tầng cao nếu được, cần cũi em bé.  ");
    var created=body(send(guest,"bookings",input));String id=created.get("id").getAsString();
    assertEquals("20-22",created.get("arrivalWindow").getAsString());assertEquals("Tầng cao nếu được, cần cũi em bé.",created.get("specialRequests").getAsString());
    assertEquals(1700000,created.get("total").getAsLong());
    assertEquals(404,send(other,"bookings/"+id+"/arrival",Map.of("arrivalWindow","14-16")).statusCode());
    var updated=send(guest,"bookings/"+id+"/arrival",Map.of("arrivalWindow","after-24","specialRequests",""));assertEquals(200,updated.statusCode(),updated.body());
    assertEquals("after-24",body(updated).get("arrivalWindow").getAsString());assertEquals("",body(updated).get("specialRequests").getAsString());
    assertEquals(1700000,body(updated).get("total").getAsLong());assertEquals(day(0),body(updated).get("arrival").getAsString());
    var staff=body(send(admin,"admin/state",null)).getAsJsonArray("bookings");
    assertTrue(staff.asList().stream().anyMatch(b->b.getAsJsonObject().get("id").getAsString().equals(id)&&b.getAsJsonObject().get("arrivalWindow").getAsString().equals("after-24")));
    assertFalse(send(client(),"rooms/ocean/calendar?from="+day(0)+"&days=7",null).body().contains("after-24"));
    assertEquals(200,send(admin,"bookings/"+id+"/status",Map.of("status","CHECKED_IN")).statusCode());
    assertEquals(409,send(guest,"bookings/"+id+"/arrival",Map.of("arrivalWindow","14-16")).statusCode());
  }
  @Test void staffNotesAreAdminOnlyAndNeverReachTheGuest()throws Exception{
    var guest=guest("note@example.test");var admin=client();send(admin,"auth/login",Map.of("email","admin@example.test","password","test-admin-password"));
    String id=body(send(guest,"bookings",booking("ocean",2,1700000,"note-stay"))).get("id").getAsString();
    assertEquals(403,send(guest,"admin/bookings/"+id+"/note",Map.of("note","tự ghi")).statusCode());
    assertEquals(404,send(admin,"admin/bookings/ST-NOPE/note",Map.of("note","x")).statusCode());
    assertEquals(400,send(admin,"admin/bookings/"+id+"/note",Map.of("note","x".repeat(501))).statusCode());
    var saved=send(admin,"admin/bookings/"+id+"/note",Map.of("note","  Khách VIP, chuẩn bị hoa.  "));assertEquals(200,saved.statusCode(),saved.body());
    var notes=body(send(admin,"admin/state",null)).getAsJsonObject("notes");
    assertEquals("Khách VIP, chuẩn bị hoa.",notes.getAsJsonObject(id).get("note").getAsString());assertEquals("admin@example.test",notes.getAsJsonObject(id).get("updatedBy").getAsString());
    var guestState=send(guest,"state",null).body();assertFalse(guestState.contains("VIP"));assertFalse(guestState.contains("\"notes\""));
    assertFalse(send(admin,"bookings/"+id+"/status",Map.of("status","CANCELLED")).body().contains("VIP"));
    assertEquals(200,send(admin,"admin/bookings/"+id+"/note",Map.of("note"," ")).statusCode());
    assertFalse(body(send(admin,"admin/state",null)).getAsJsonObject("notes").has(id));
  }
}
