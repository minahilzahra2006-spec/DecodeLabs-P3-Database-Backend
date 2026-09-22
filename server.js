const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors());

let db;

// SQLite Database Setup (Automated local file database)
async function initDatabase() {
    try {
        db = await open({
            filename: './BurgerDB.sqlite',
            driver: sqlite3.Database
        });

        // Create Table if not exists
        await db.exec(`
            CREATE TABLE IF NOT EXISTS Burgers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL
            );
        `);

        // Insert initial data if table is empty
        const count = await db.get('SELECT COUNT(*) as count FROM Burgers');
        if (count.count === 0) {
            await db.run("INSERT INTO Burgers (name, price) VALUES ('Classic Beef', 8.99)");
            await db.run("INSERT INTO Burgers (name, price) VALUES ('Crispy Chicken', 9.49)");
            await db.run("INSERT INTO Burgers (name, price) VALUES ('Smoky BBQ', 10.49)");
        }

        console.log(' Connected to SQLite Database: BurgerDB.sqlite');

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error(' Database Initialization Failed:', err.message);
    }
}

// Root Route
app.get('/', (req, res) => {
    res.send('Burger API is running! Go to /burgers to see the menu.');
});

// 1. GET ALL BURGERS
app.get('/burgers', async (req, res) => {
    try {
        const burgers = await db.all('SELECT * FROM Burgers');
        res.json(burgers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. GET BURGER BY ID
app.get('/burgers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const burger = await db.get('SELECT * FROM Burgers WHERE id = ?', [id]);

        if (!burger) {
            return res.status(404).json({ message: "Burger not found" });
        }
        res.json(burger);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. POST / CREATE BURGER
app.post('/burgers', async (req, res) => {
    try {
        const { name, price } = req.body;
        if (!name || price === undefined) {
            return res.status(400).json({ message: "Name and price are required!" });
        }

        const result = await db.run('INSERT INTO Burgers (name, price) VALUES (?, ?)', [name, price]);
        const newBurger = await db.get('SELECT * FROM Burgers WHERE id = ?', [result.lastID]);

        res.status(201).json({
            message: "Burger added successfully!",
            data: newBurger
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. PUT / UPDATE BURGER
app.put('/burgers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price } = req.body;

        const result = await db.run(
            'UPDATE Burgers SET name = ?, price = ? WHERE id = ?',
            [name, price, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ message: "Burger not found" });
        }

        const updatedBurger = await db.get('SELECT * FROM Burgers WHERE id = ?', [id]);
        res.json({
            message: "Burger updated successfully!",
            data: updatedBurger
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. DELETE BURGER
app.delete('/burgers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.run('DELETE FROM Burgers WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ message: "Burger not found" });
        }

        res.json({ message: "Burger deleted successfully from database!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

initDatabase();