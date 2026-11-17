package com.lifeguard.app.models;

public class ChatMessage {
    private String sender; // "user" or "bot"
    private String text;
    private long timestamp;

    public ChatMessage(String sender, String text) {
        this.sender = sender;
        this.text = text;
        this.timestamp = System.currentTimeMillis();
    }

    public String getSender() { return sender; }
    public String getText() { return text; }
    public long getTimestamp() { return timestamp; }
}
