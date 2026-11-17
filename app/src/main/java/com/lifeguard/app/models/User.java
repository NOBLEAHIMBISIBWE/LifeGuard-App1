package com.lifeguard.app.models;

public class User {
    private String id;
    private String fullName;
    private String email;
    private String phone;
    private String nin;
    private String gender;
    private boolean isResponder;

    public User() {}

    public User(String id, String fullName, String email, String phone, String nin, String gender, boolean isResponder) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.nin = nin;
        this.gender = gender;
        this.isResponder = isResponder;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getNin() { return nin; }
    public void setNin(String nin) { this.nin = nin; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public boolean isResponder() { return isResponder; }
    public void setResponder(boolean responder) { isResponder = responder; }
}
