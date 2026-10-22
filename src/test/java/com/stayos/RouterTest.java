package com.stayos;

import com.stayos.auth.*;
import com.stayos.booking.BookingService;
import com.stayos.http.Router;
import com.stayos.http.Router.Access;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;
import static org.junit.jupiter.api.Assertions.*;

/** The route table itself, and a contract check that every path the web app calls exists on the server. */
class RouterTest {
  @TempDir Path temp;

  @Test void templatesMatchSegmentsAndRejectDuplicates(){
    var r=new Router().post("/api/support/{id}/messages",Access.SIGNED_IN,c->null).limited();
    var m=r.match("POST","/api/support/RQ-1/messages").orElseThrow();
    assertEquals(List.of("RQ-1"),m.params());assertTrue(m.route().limited());
    assertTrue(r.match("GET","/api/support/RQ-1/messages").isEmpty());
    assertTrue(r.match("POST","/api/support/a/b/messages").isEmpty(),"a parameter never spans segments");
    assertTrue(r.match("POST","/api/support/RQ-1/messages/extra").isEmpty());
    assertThrows(IllegalStateException.class,()->r.post("/api/support/{id}/messages",Access.PUBLIC,c->null));
  }

  @Test void everyApiPathTheWebAppCallsHasARoute()throws Exception{
    String url="jdbc:sqlite:"+temp.resolve("t.sqlite");
    try(var auth=new AuthService(url,"admin@example.test","test-admin-password",false);var bookings=new BookingService(url)){
      var router=new AuthServer(auth,bookings,0).router();
      var call=Pattern.compile("\\b(?:api|post)\\(\\s*[`']([^`']+)[`']");
      var missing=new TreeSet<String>();int checked=0;
      try(var files=Files.walk(Path.of("src/main/resources/web/src"))){
        for(Path file:files.filter(f->f.toString().matches(".*\\.jsx?$")).toList()){
          Matcher m=call.matcher(Files.readString(file));
          while(m.find()){
            String path="/api/"+m.group(1).replaceAll("\\$\\{[^}]*\\}","x").replaceAll("\\?.*$","");
            checked++;
            if(router.match("GET",path).isEmpty()&&router.match("POST",path).isEmpty())missing.add(path+" ("+file.getFileName()+")");
          }
        }
      }
      assertTrue(checked>25,"scanned "+checked+" calls");
      assertEquals(Set.of(),missing,"web app calls endpoints the server does not have");
    }
  }

  @Test void onlyCatalogAndSignInRoutesArePublic()throws Exception{
    String url="jdbc:sqlite:"+temp.resolve("t.sqlite");
    try(var auth=new AuthService(url,"admin@example.test","test-admin-password",false);var bookings=new BookingService(url)){
      var open=new AuthServer(auth,bookings,0).router().routes().stream().filter(r->r.access()==Access.PUBLIC).map(r->r.method()+" "+r.template()).toList();
      assertEquals(List.of("GET /api/health","GET /api/availability","GET /api/rooms/{room}/calendar","GET /api/rooms/{room}/reviews","GET /api/reviews/summary",
        "POST /api/auth/login","POST /api/auth/register","POST /api/auth/reset"),open,"a new public route must be a deliberate decision");
    }
  }
}
