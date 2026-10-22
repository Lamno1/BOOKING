package com.stayos.bridge;

import com.stayos.service.HealthService;

public final class JavaScriptBridge {
    private final HealthService service = new HealthService();

    public String getHealthDto() {
        var health = service.health();
        return "{\"status\":\"" + health.status() + "\",\"version\":\"" + health.version() + "\"}";
    }

    public String log(String message) {
        String result = "java:" + message;
        System.out.println("[JS] " + message);
        return result;
    }
}
