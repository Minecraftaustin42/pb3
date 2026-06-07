const express = require("express");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

const app = express();

app.use(express.json());

app.use(session({
    secret: "sculptinggame_secret9293kool",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

const USERS_FILE = "./users.json";

function getUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, "[]");
        return [];
    }

    const data = fs.readFileSync(USERS_FILE, "utf8");

    if (!data.trim()) {
        fs.writeFileSync(USERS_FILE, "[]");
        return [];
    }

    return JSON.parse(data);
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function checkCurrencyBadges(user) {
    if (!user.badges) user.badges = [];

    const newBadges = [];

    function giveBadge(name) {
        if (!user.badges.includes(name)) {
            user.badges.push(name);
            newBadges.push(name);
        }
    }

    if (user.currencies.SculptCoins >= 1000) {
        giveBadge("First 1000 SculptCoins");
    }

    if (user.currencies.Points >= 2000) {
        giveBadge("First 2000 Points");
    }

    if (user.currencies.Diamonds >= 10) {
        giveBadge("First 10 Diamonds");
    }

    return newBadges;
}

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/auth.html");
    }

    next();
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "auth.html"));
});

app.get("/home.html", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

app.get("/badges.html", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "badges.html"));
});

app.use(express.static(__dirname));

app.post("/signup", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, message: "Missing fields" });
    }

    const users = getUsers();

    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.json({ success: false, message: "Username exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nextUserId =
        users.length > 0
            ? Math.max(...users.map(u => u.userId || 0)) + 1
            : 1;

    users.push({
        username,
        userId: nextUserId,
        joinDate: new Date().toISOString(),
        passwordHash,
        currencies: {
            SculptCoins: 0,
            Points: 100,
            Diamonds: 0
        },
        badges: [
            "Welcome to Playsculpt"
        ]
    });

    saveUsers(users);

    res.json({ success: true });
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const users = getUsers();

    const user = users.find(
        u => u.username.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
        return res.json({ success: false, message: "Invalid login" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
        return res.json({ success: false, message: "Invalid login" });
    }

    req.session.user = {
        username: user.username
    };

    res.json({
        success: true,
        message: "Logged in"
    });
});

app.get("/me", (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: "Not logged in" });
    }

    const users = getUsers();
    const user = users.find(u => u.username === req.session.user.username);

    if (!user) {
        return res.json({ success: false, message: "User not found" });
    }

    const newBadges = checkCurrencyBadges(user);

    if (newBadges.length > 0) {
        saveUsers(users);
    }

    res.json({
        success: true,
        userId: user.userId,
        joinDate: user.joinDate,
        username: user.username,
        currencies: user.currencies,
        badges: user.badges || [],
        newBadges
    });
});

app.post("/currency/add", (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: "Not logged in" });
    }

    const { type, amount } = req.body;

    const users = getUsers();
    const user = users.find(u => u.username === req.session.user.username);

    if (!user) {
        return res.json({ success: false, message: "User not found" });
    }

    if (!["SculptCoins", "Points", "Diamonds"].includes(type)) {
        return res.json({ success: false, message: "Invalid currency" });
    }

    user.currencies[type] += Number(amount);

    const newBadges = checkCurrencyBadges(user);

    saveUsers(users);

    res.json({
        success: true,
        currencies: user.currencies,
        badges: user.badges,
        newBadges
    });
});

app.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

app.listen(3008, () => {
    console.log("Server running on port 3008");
});