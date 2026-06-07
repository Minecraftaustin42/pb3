const express = require("express");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

const app = express();

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: false }));

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

const USERS_FILE = path.join(__dirname, "users.json");
const GAMES_FILE = path.join(__dirname, "games.json");
const GROUPS_FILE = path.join(__dirname, "groups.json");

const ALL_BADGES = [
    "Welcome to Playsculpt",
    "First 1000 SculptCoins",
    "First 2000 Points",
    "First 10 Diamonds",
    "First Game Created",
    "First Game Played",
    "Joined First Group",
    "Created First Group",
    "Avatar Customized",
    "Daily Reward Claimed",
    "5 Games Played",
    "10 Games Played",
    "First Public Game"
];

function readJsonFile(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
            return fallback;
        }

        const data = fs.readFileSync(filePath, "utf8");

        if (!data.trim()) {
            fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
            return fallback;
        }

        return JSON.parse(data);
    } catch (error) {
        console.log("JSON file could not be read safely:", filePath, error.message);
        return fallback;
    }
}

function writeJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getUsers() {
    const users = readJsonFile(USERS_FILE, []);
    let changed = false;

    users.forEach((user, index) => {
        if (!user.userId) {
            user.userId = index + 1;
            changed = true;
        }
        if (!user.joinDate) {
            user.joinDate = new Date().toISOString();
            changed = true;
        }
        if (!user.currencies) {
            user.currencies = { SculptCoins: 0, Points: 100, Diamonds: 0 };
            changed = true;
        }
        if (typeof user.currencies.SculptCoins !== "number") user.currencies.SculptCoins = 0;
        if (typeof user.currencies.Points !== "number") user.currencies.Points = 100;
        if (typeof user.currencies.Diamonds !== "number") user.currencies.Diamonds = 0;
        if (!Array.isArray(user.badges)) {
            user.badges = ["Welcome to Playsculpt"];
            changed = true;
        }
        if (!user.badges.includes("Welcome to Playsculpt")) {
            user.badges.push("Welcome to Playsculpt");
            changed = true;
        }
        if (typeof user.bio !== "string") {
            user.bio = "";
            changed = true;
        }
        if (!user.avatar) {
            user.avatar = { color: "#6b5cff" };
            changed = true;
        }
        if (!user.stats) {
            user.stats = {
                gamesCreated: 0,
                gamesPlayed: [],
                groupsJoined: [],
                groupsCreated: 0,
                avatarCustomized: false,
                dailyRewardClaims: 0
            };
            changed = true;
        }
        if (!Array.isArray(user.stats.gamesPlayed)) user.stats.gamesPlayed = [];
        if (!Array.isArray(user.stats.groupsJoined)) user.stats.groupsJoined = [];
        if (typeof user.stats.gamesCreated !== "number") user.stats.gamesCreated = 0;
        if (typeof user.stats.groupsCreated !== "number") user.stats.groupsCreated = 0;
        if (typeof user.stats.avatarCustomized !== "boolean") user.stats.avatarCustomized = false;
        if (typeof user.stats.dailyRewardClaims !== "number") user.stats.dailyRewardClaims = 0;
    });

    if (changed) saveUsers(users);
    return users;
}

function saveUsers(users) {
    writeJsonFile(USERS_FILE, users);
}

function getGames() {
    return readJsonFile(GAMES_FILE, []);
}

function saveGames(games) {
    writeJsonFile(GAMES_FILE, games);
}

function getGroups() {
    return readJsonFile(GROUPS_FILE, []);
}

function saveGroups(groups) {
    writeJsonFile(GROUPS_FILE, groups);
}

function requireLogin(req, res, next) {
    if (!req.session.user || !req.session.user.userId) {
        return res.redirect("/auth.html");
    }

    next();
}

function requireLoginJson(req, res, next) {
    if (!req.session.user || !req.session.user.userId) {
        return res.json({ success: false, message: "Not logged in" });
    }

    next();
}

function findCurrentUser(users, req) {
    if (!req.session.user || !req.session.user.userId) return null;
    return users.find(user => user.userId === req.session.user.userId);
}

function cleanText(value, maxLength) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
}

function cleanColor(value) {
    if (typeof value !== "string") return "#6b5cff";
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    const simpleColors = ["blue", "purple", "gray", "white", "red", "green", "orange", "yellow", "pink", "black"];
    if (simpleColors.includes(value.toLowerCase())) return value.toLowerCase();
    return "#6b5cff";
}

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function checkBadges(user) {
    if (!user.badges) user.badges = [];
    if (!user.stats) user.stats = {};

    const newBadges = [];

    function giveBadge(name) {
        if (!user.badges.includes(name)) {
            user.badges.push(name);
            newBadges.push(name);
        }
    }

    giveBadge("Welcome to Playsculpt");

    if (user.currencies.SculptCoins >= 1000) giveBadge("First 1000 SculptCoins");
    if (user.currencies.Points >= 2000) giveBadge("First 2000 Points");
    if (user.currencies.Diamonds >= 10) giveBadge("First 10 Diamonds");
    if ((user.stats.gamesCreated || 0) >= 1) giveBadge("First Game Created");
    if ((user.stats.gamesPlayed || []).length >= 1) giveBadge("First Game Played");
    if ((user.stats.groupsJoined || []).length >= 1) giveBadge("Joined First Group");
    if ((user.stats.groupsCreated || 0) >= 1) giveBadge("Created First Group");
    if (user.stats.avatarCustomized) giveBadge("Avatar Customized");
    if ((user.stats.dailyRewardClaims || 0) >= 1) giveBadge("Daily Reward Claimed");
    if ((user.stats.gamesPlayed || []).length >= 5) giveBadge("5 Games Played");
    if ((user.stats.gamesPlayed || []).length >= 10) giveBadge("10 Games Played");
    if (user.stats.firstPublicGame) giveBadge("First Public Game");

    return newBadges;
}

function publicUser(user) {
    return {
        userId: user.userId,
        username: user.username,
        joinDate: user.joinDate,
        bio: user.bio || "",
        avatar: user.avatar || { color: "#6b5cff" },
        currencies: user.currencies || { SculptCoins: 0, Points: 0, Diamonds: 0 },
        badges: user.badges || []
    };
}

function addCurrency(user, type, amount) {
    if (!user.currencies) user.currencies = { SculptCoins: 0, Points: 0, Diamonds: 0 };
    if (!["SculptCoins", "Points", "Diamonds"].includes(type)) return false;
    user.currencies[type] = Math.max(0, user.currencies[type] + amount);
    return true;
}

function canViewGame(game, req) {
    if (!game) return false;
    if (game.visibility === "public") return true;
    return req.session.user && req.session.user.userId === game.creatorId;
}

function page(fileName) {
    return path.join(__dirname, fileName);
}

app.get("/", (req, res) => {
    if (req.session.user) return res.redirect("/home.html");
    res.sendFile(page("auth.html"));
});

app.get("/auth.html", (req, res) => res.sendFile(page("auth.html")));
app.get("/home.html", requireLogin, (req, res) => res.sendFile(page("home.html")));
app.get("/badges.html", requireLogin, (req, res) => res.sendFile(page("badges.html")));
app.get("/profile.html", requireLogin, (req, res) => res.sendFile(page("profile.html")));
app.get("/avatar.html", requireLogin, (req, res) => res.sendFile(page("avatar.html")));
app.get("/games.html", requireLogin, (req, res) => res.sendFile(page("games.html")));
app.get("/create-game.html", requireLogin, (req, res) => res.sendFile(page("create-game.html")));
app.get("/edit-game.html", requireLogin, (req, res) => res.sendFile(page("edit-game.html")));
app.get("/play.html", requireLogin, (req, res) => res.sendFile(page("play.html")));
app.get("/groups.html", requireLogin, (req, res) => res.sendFile(page("groups.html")));
app.get("/create-group.html", requireLogin, (req, res) => res.sendFile(page("create-group.html")));
app.get("/group.html", requireLogin, (req, res) => res.sendFile(page("group.html")));
app.get("/user/:userId", (req, res) => res.sendFile(page("profile.html")));

app.get("/api/badges/all", (req, res) => {
    res.json({ success: true, badges: ALL_BADGES });
});

app.post("/signup", async (req, res) => {
    const username = cleanText(req.body.username, 20);
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!username || !password) {
        return res.json({ success: false, message: "Missing fields" });
    }

    if (!/^[a-zA-Z0-9_]{1,20}$/.test(username)) {
        return res.json({ success: false, message: "Username can only use letters, numbers, and underscores" });
    }

    if (password.length < 3 || password.length > 100) {
        return res.json({ success: false, message: "Password must be 3 to 100 characters" });
    }

    const users = getUsers();

    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.json({ success: false, message: "Username exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nextUserId = users.length > 0 ? Math.max(...users.map(u => u.userId || 0)) + 1 : 1;

    users.push({
        username,
        userId: nextUserId,
        joinDate: new Date().toISOString(),
        passwordHash,
        bio: "",
        avatar: { color: "#6b5cff" },
        currencies: { SculptCoins: 0, Points: 100, Diamonds: 0 },
        badges: ["Welcome to Playsculpt"],
        stats: {
            gamesCreated: 0,
            gamesPlayed: [],
            groupsJoined: [],
            groupsCreated: 0,
            avatarCustomized: false,
            dailyRewardClaims: 0
        }
    });

    saveUsers(users);
    res.json({ success: true });
});

app.post("/login", async (req, res) => {
    const username = cleanText(req.body.username, 20);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) return res.json({ success: false, message: "Invalid login" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.json({ success: false, message: "Invalid login" });

    req.session.user = { userId: user.userId };
    res.json({ success: true, message: "Logged in" });
});

app.get("/me", requireLoginJson, (req, res) => {
    const users = getUsers();
    const user = findCurrentUser(users, req);
    if (!user) return res.json({ success: false, message: "User not found" });

    const newBadges = checkBadges(user);
    if (newBadges.length > 0) saveUsers(users);

    res.json({ success: true, ...publicUser(user), newBadges });
});

app.post("/profile/bio", requireLoginJson, (req, res) => {
    const users = getUsers();
    const user = findCurrentUser(users, req);
    if (!user) return res.json({ success: false, message: "User not found" });

    user.bio = cleanText(req.body.bio, 300);
    saveUsers(users);
    res.json({ success: true, bio: user.bio });
});

app.get("/api/profile/:userId", (req, res) => {
    const users = getUsers();
    const games = getGames();
    const groups = getGroups();
    const userId = Number(req.params.userId);
    const user = users.find(item => item.userId === userId);
    if (!user) return res.json({ success: false, message: "User not found" });

    const isOwner = req.session.user && req.session.user.userId === user.userId;
    const createdGames = games
        .filter(game => game.creatorId === user.userId && (isOwner || game.visibility === "public"))
        .map(game => ({ gameId: game.gameId, title: game.title, genre: game.genre, visibility: game.visibility }));
    const joinedGroups = groups
        .filter(group => Array.isArray(group.members) && group.members.includes(user.userId))
        .map(group => ({ groupId: group.groupId, name: group.name }));

    res.json({ success: true, profile: publicUser(user), isOwner, createdGames, joinedGroups });
});

app.post("/avatar/update", requireLoginJson, (req, res) => {
    const users = getUsers();
    const user = findCurrentUser(users, req);
    if (!user) return res.json({ success: false, message: "User not found" });

    user.avatar = { color: cleanColor(req.body.color) };
    user.stats.avatarCustomized = true;
    const newBadges = checkBadges(user);
    saveUsers(users);
    res.json({ success: true, avatar: user.avatar, newBadges });
});

app.get("/api/games", requireLoginJson, (req, res) => {
    const users = getUsers();
    const games = getGames();
    const currentUser = findCurrentUser(users, req);
    if (!currentUser) return res.json({ success: false, message: "User not found" });

    const visibleGames = games
        .filter(game => game.visibility === "public" || game.creatorId === currentUser.userId)
        .map(game => {
            const creator = users.find(user => user.userId === game.creatorId);
            return {
                gameId: game.gameId,
                title: game.title,
                description: game.description,
                genre: game.genre,
                visibility: game.visibility,
                creatorId: game.creatorId,
                creatorUsername: creator ? creator.username : "Unknown",
                objectCount: (game.objects || []).length
            };
        });

    res.json({ success: true, games: visibleGames });
});

app.post("/api/games/create", requireLoginJson, (req, res) => {
    const users = getUsers();
    const games = getGames();
    const user = findCurrentUser(users, req);
    if (!user) return res.json({ success: false, message: "User not found" });

    const title = cleanText(req.body.title, 60);
    const description = cleanText(req.body.description, 300);
    const genre = cleanText(req.body.genre, 30);
    const visibility = req.body.visibility === "private" ? "private" : "public";

    if (!title) return res.json({ success: false, message: "Game title is required" });
    if (!genre) return res.json({ success: false, message: "Genre is required" });

    const nextGameId = games.length > 0 ? Math.max(...games.map(game => game.gameId || 0)) + 1 : 1;
    const game = {
        gameId: nextGameId,
        title,
        description,
        genre,
        visibility,
        creatorId: user.userId,
        createdAt: new Date().toISOString(),
        objects: [
            { objectId: 1, name: "Start Block", type: "platform", x: 0, y: 0, color: "#8b5cf6" },
            { objectId: 2, name: "Welcome Sign", type: "sign", x: 120, y: 40, color: "#2563eb" }
        ],
        playedBy: []
    };

    games.push(game);
    user.stats.gamesCreated += 1;
    if (visibility === "public") user.stats.firstPublicGame = true;
    const newBadges = checkBadges(user);
    saveGames(games);
    saveUsers(users);
    res.json({ success: true, gameId: game.gameId, newBadges });
});

app.get("/api/games/:gameId", requireLoginJson, (req, res) => {
    const users = getUsers();
    const games = getGames();
    const gameId = Number(req.params.gameId);
    const game = games.find(item => item.gameId === gameId);

    if (!canViewGame(game, req)) return res.json({ success: false, message: "Game not found or private" });

    const creator = users.find(user => user.userId === game.creatorId);
    res.json({
        success: true,
        game: {
            ...game,
            creatorUsername: creator ? creator.username : "Unknown",
            creatorAvatar: creator ? creator.avatar : { color: "#6b5cff" },
            isCreator: req.session.user.userId === game.creatorId
        }
    });
});

app.post("/api/games/:gameId/update", requireLoginJson, (req, res) => {
    const users = getUsers();
    const games = getGames();
    const gameId = Number(req.params.gameId);
    const game = games.find(item => item.gameId === gameId);

    if (!game || game.creatorId !== req.session.user.userId) {
        return res.json({ success: false, message: "Only the creator can edit this game" });
    }

    const title = cleanText(req.body.title, 60);
    const description = cleanText(req.body.description, 300);
    const genre = cleanText(req.body.genre, 30);
    const visibility = req.body.visibility === "private" ? "private" : "public";

    if (!title) return res.json({ success: false, message: "Game title is required" });
    if (!genre) return res.json({ success: false, message: "Genre is required" });

    game.title = title;
    game.description = description;
    game.genre = genre;
    game.visibility = visibility;

    const user = findCurrentUser(users, req);
    if (user && visibility === "public") {
        user.stats.firstPublicGame = true;
        checkBadges(user);
        saveUsers(users);
    }

    saveGames(games);
    res.json({ success: true });
});

app.post("/api/games/:gameId/objects", requireLoginJson, (req, res) => {
    const games = getGames();
    const gameId = Number(req.params.gameId);
    const game = games.find(item => item.gameId === gameId);

    if (!game || game.creatorId !== req.session.user.userId) {
        return res.json({ success: false, message: "Only the creator can edit objects" });
    }

    const allowedTypes = ["cube", "sign", "platform", "coin"];
    const incomingObjects = Array.isArray(req.body.objects) ? req.body.objects : [];

    game.objects = incomingObjects.slice(0, 50).map((object, index) => ({
        objectId: index + 1,
        name: cleanText(object.name, 40) || "Object " + (index + 1),
        type: allowedTypes.includes(object.type) ? object.type : "cube",
        x: Math.max(-500, Math.min(500, Number(object.x) || 0)),
        y: Math.max(-500, Math.min(500, Number(object.y) || 0)),
        color: cleanColor(object.color)
    }));

    saveGames(games);
    res.json({ success: true, objects: game.objects });
});

app.post("/api/games/:gameId/play-reward", requireLoginJson, (req, res) => {
    const users = getUsers();
    const games = getGames();
    const user = findCurrentUser(users, req);
    const gameId = Number(req.params.gameId);
    const game = games.find(item => item.gameId === gameId);

    if (!user) return res.json({ success: false, message: "User not found" });
    if (!canViewGame(game, req)) return res.json({ success: false, message: "Game not found or private" });

    if (!Array.isArray(game.playedBy)) game.playedBy = [];
    if (!Array.isArray(user.stats.gamesPlayed)) user.stats.gamesPlayed = [];

    const alreadyPlayed = user.stats.gamesPlayed.includes(game.gameId);
    let earnedPoints = 0;
    let creatorEarned = 0;

    if (!alreadyPlayed) {
        user.stats.gamesPlayed.push(game.gameId);
        game.playedBy.push(user.userId);

        if (game.visibility === "public") {
            earnedPoints = 15;
            addCurrency(user, "Points", earnedPoints);

            if (game.creatorId !== user.userId) {
                const creator = users.find(item => item.userId === game.creatorId);
                if (creator) {
                    creatorEarned = 5;
                    addCurrency(creator, "SculptCoins", creatorEarned);
                    checkBadges(creator);
                }
            }
        }
    }

    const newBadges = checkBadges(user);
    saveUsers(users);
    saveGames(games);
    res.json({ success: true, earnedPoints, creatorEarned, newBadges, alreadyPlayed });
});

app.post("/api/daily-reward", requireLoginJson, (req, res) => {
    const users = getUsers();
    const user = findCurrentUser(users, req);
    if (!user) return res.json({ success: false, message: "User not found" });

    const today = todayKey();
    if (user.lastDailyReward === today) {
        return res.json({ success: false, message: "Daily reward already claimed today", currencies: user.currencies });
    }

    user.lastDailyReward = today;
    user.stats.dailyRewardClaims += 1;
    addCurrency(user, "Points", 50);
    const newBadges = checkBadges(user);
    saveUsers(users);
    res.json({ success: true, message: "You claimed 50 Points!", currencies: user.currencies, newBadges });
});

app.post("/currency/add", requireLoginJson, (req, res) => {
    res.json({
        success: false,
        message: "Direct currency grants are disabled. Earn currency through daily rewards, game plays, and creator rewards."
    });
});

app.get("/api/groups", requireLoginJson, (req, res) => {
    const users = getUsers();
    const groups = getGroups();
    const data = groups.map(group => ({
        groupId: group.groupId,
        name: group.name,
        description: group.description,
        ownerId: group.ownerId,
        ownerUsername: (users.find(user => user.userId === group.ownerId) || {}).username || "Unknown",
        memberCount: (group.members || []).length,
        isMember: (group.members || []).includes(req.session.user.userId),
        isOwner: group.ownerId === req.session.user.userId
    }));

    res.json({ success: true, groups: data });
});

app.post("/api/groups/create", requireLoginJson, (req, res) => {
    const users = getUsers();
    const groups = getGroups();
    const user = findCurrentUser(users, req);

    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.currencies.SculptCoins < 100) {
        return res.json({ success: false, message: "Creating a group costs 100 SculptCoins" });
    }

    const name = cleanText(req.body.name, 50);
    const description = cleanText(req.body.description, 300);
    if (!name) return res.json({ success: false, message: "Group name is required" });

    const nextGroupId = groups.length > 0 ? Math.max(...groups.map(group => group.groupId || 0)) + 1 : 1;
    const group = {
        groupId: nextGroupId,
        name,
        description,
        ownerId: user.userId,
        createdAt: new Date().toISOString(),
        members: [user.userId],
        announcements: []
    };

    groups.push(group);
    addCurrency(user, "SculptCoins", -100);
    user.stats.groupsCreated += 1;
    if (!user.stats.groupsJoined.includes(group.groupId)) user.stats.groupsJoined.push(group.groupId);
    const newBadges = checkBadges(user);
    saveGroups(groups);
    saveUsers(users);
    res.json({ success: true, groupId: group.groupId, newBadges });
});

app.get("/api/groups/:groupId", requireLoginJson, (req, res) => {
    const users = getUsers();
    const groups = getGroups();
    const groupId = Number(req.params.groupId);
    const group = groups.find(item => item.groupId === groupId);
    if (!group) return res.json({ success: false, message: "Group not found" });

    const owner = users.find(user => user.userId === group.ownerId);
    const members = (group.members || []).map(memberId => {
        const member = users.find(user => user.userId === memberId);
        return member ? { userId: member.userId, username: member.username } : null;
    }).filter(Boolean);

    res.json({
        success: true,
        group: {
            ...group,
            ownerUsername: owner ? owner.username : "Unknown",
            members,
            isMember: (group.members || []).includes(req.session.user.userId),
            isOwner: group.ownerId === req.session.user.userId
        }
    });
});

app.post("/api/groups/:groupId/join", requireLoginJson, (req, res) => {
    const users = getUsers();
    const groups = getGroups();
    const user = findCurrentUser(users, req);
    const group = groups.find(item => item.groupId === Number(req.params.groupId));

    if (!user || !group) return res.json({ success: false, message: "Group not found" });
    if (!Array.isArray(group.members)) group.members = [];
    if (!group.members.includes(user.userId)) group.members.push(user.userId);
    if (!user.stats.groupsJoined.includes(group.groupId)) user.stats.groupsJoined.push(group.groupId);

    const newBadges = checkBadges(user);
    saveUsers(users);
    saveGroups(groups);
    res.json({ success: true, newBadges });
});

app.post("/api/groups/:groupId/leave", requireLoginJson, (req, res) => {
    const users = getUsers();
    const groups = getGroups();
    const user = findCurrentUser(users, req);
    const group = groups.find(item => item.groupId === Number(req.params.groupId));

    if (!user || !group) return res.json({ success: false, message: "Group not found" });
    if (group.ownerId === user.userId) return res.json({ success: false, message: "Owners must abandon/delete their group instead" });

    group.members = (group.members || []).filter(memberId => memberId !== user.userId);
    user.stats.groupsJoined = (user.stats.groupsJoined || []).filter(groupId => groupId !== group.groupId);
    saveUsers(users);
    saveGroups(groups);
    res.json({ success: true });
});

app.post("/api/groups/:groupId/announce", requireLoginJson, (req, res) => {
    const groups = getGroups();
    const group = groups.find(item => item.groupId === Number(req.params.groupId));
    if (!group || group.ownerId !== req.session.user.userId) {
        return res.json({ success: false, message: "Only the owner can post announcements" });
    }

    const message = cleanText(req.body.message, 300);
    if (!message) return res.json({ success: false, message: "Announcement cannot be empty" });

    if (!Array.isArray(group.announcements)) group.announcements = [];
    group.announcements.unshift({ message, createdAt: new Date().toISOString() });
    group.announcements = group.announcements.slice(0, 20);
    saveGroups(groups);
    res.json({ success: true });
});

app.post("/api/groups/:groupId/delete", requireLoginJson, (req, res) => {
    const users = getUsers();
    const groups = getGroups();
    const group = groups.find(item => item.groupId === Number(req.params.groupId));
    if (!group || group.ownerId !== req.session.user.userId) {
        return res.json({ success: false, message: "Only the owner can delete this group" });
    }

    const remainingGroups = groups.filter(item => item.groupId !== group.groupId);
    users.forEach(user => {
        if (user.stats && Array.isArray(user.stats.groupsJoined)) {
            user.stats.groupsJoined = user.stats.groupsJoined.filter(groupId => groupId !== group.groupId);
        }
    });

    saveGroups(remainingGroups);
    saveUsers(users);
    res.json({ success: true });
});

app.post("/logout", requireLoginJson, (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
