import com.google.gson.*;
import com.stayos.auth.*;
import com.stayos.booking.BookingService;
import java.nio.file.*;
import java.time.*;
import java.util.concurrent.CountDownLatch;

/** Creates a new, isolated UI test database on each run. Never opens the working ledger. */
class GuestOperationsQa {
 public static void main(String[] args)throws Exception{
  Path folder=Files.createTempDirectory(Path.of("target").toAbsolutePath(),"guest-operations-qa-");
  String url="jdbc:sqlite:"+folder.resolve("qa.sqlite");
  var auth=new AuthService(url,"admin@operations.test","qa-admin-password",false);
  auth.register("guest@operations.test","qa-guest-password","Khách kiểm thử");
  var bookings=new BookingService(url);var input=new JsonObject();
  input.addProperty("catalogVersion","two-properties-demo-v1");input.addProperty("propertyId","residence");input.addProperty("roomId","ocean");input.addProperty("guestName","Khách kiểm thử");input.addProperty("email","guest@operations.test");input.addProperty("guests",2);input.addProperty("arrival",LocalDate.now(BookingService.ZONE).plusDays(1).toString());input.addProperty("departure",LocalDate.now(BookingService.ZONE).plusDays(3).toString());input.addProperty("requestId","qa-fixture-only");input.addProperty("expectedTotal",1700000);input.add("addons",new JsonArray());
  bookings.create(new AuthService.User("guest@operations.test","guest","Khách kiểm thử"),input);
  var server=new AuthServer(auth,bookings,8081);server.start();
  Runtime.getRuntime().addShutdownHook(new Thread(()->{server.stop();try{bookings.close();auth.close();}catch(Exception ignored){}}));
  System.out.println("Isolated guest-operations QA API: http://127.0.0.1:8081 · database: "+folder.resolve("qa.sqlite"));
  new CountDownLatch(1).await();
 }
}
