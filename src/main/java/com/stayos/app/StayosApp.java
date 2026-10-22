package com.stayos.app;
import com.stayos.bridge.JavaScriptBridge;
import com.stayos.database.Database;
import com.stayos.auth.*;
import java.nio.file.Files;
import java.nio.file.Path;
import javafx.application.Application;
import javafx.concurrent.Worker;
import javafx.scene.Scene;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
public final class StayosApp extends Application {
  public static void main(String[] a){launch(a);}
  public void start(Stage st)throws Exception{
   Files.createDirectories(Path.of("data"));
    String apiDatabase="jdbc:sqlite:"+System.getenv().getOrDefault("STAYOS_DATABASE","data/stayos-web.sqlite");
    AuthService auth=new AuthService(apiDatabase);
    var bookings=new com.stayos.booking.BookingService(apiDatabase);
    AuthServer authServer=new AuthServer(auth,bookings); authServer.start();
   try(var d=new Database("jdbc:sqlite:data/stayos.sqlite")){d.write("last_start","ok");System.out.println("SQLite: "+d.read("last_start"));}
   var w=new WebView(); var b=new JavaScriptBridge();
  w.getEngine().setOnError(e -> System.err.println("JavaFX WebView: "+e.getMessage()));
  w.getEngine().getLoadWorker().exceptionProperty().addListener((o,x,e)->{if(e!=null)e.printStackTrace();});
  w.getEngine().getLoadWorker().stateProperty().addListener((o,x,s)->{if(s==Worker.State.SUCCEEDED){w.getEngine().executeScript("window.javaBridge={getHealthDto:function(){return '"+b.getHealthDto()+"'},log:function(m){console.log('java:'+m);return 'java:'+m}}; window.dispatchEvent(new Event('java-bridge-ready')); ");}});
  boolean dev="true".equalsIgnoreCase(System.getenv("STAYOS_DEV"));
  String url=dev?"http://localhost:5173":getClass().getResource("/web/index.html").toExternalForm();
  System.out.println("STAYOS mode: "+(dev?"DEV "+url:"PRODUCTION packaged frontend")); w.getEngine().load(url);
  st.setTitle("STAYOS Foundation"); st.setScene(new Scene(w,1280,800)); st.show(); st.setOnHidden(e -> { authServer.stop(); try { bookings.close(); auth.close(); } catch (java.sql.SQLException ignored) { } });
 }
}




