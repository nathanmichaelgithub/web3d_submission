<?php
// Model layer for Sports 3D, handles all PDO/SQLite access for the interactions table
// no business logic lives in here, that all sits in the Controller
class Model {
    private PDO $db;

    public function __construct() {
        //connect to the SQLite database, path is relative to this file
        $dbPath = __DIR__ . '/../../db/sports.db';
        $this->db = new PDO('sqlite:' . $dbPath);
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        // Default to assoc fetch so rows come back as nice keyed arrays
        $this->db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    // Create the interactions table if it doesn't already exist, safe to call every request
    public function dbCreateTable(): void {
        $this->db->exec("CREATE TABLE IF NOT EXISTS interactions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            sport      TEXT    NOT NULL,
            type       TEXT    NOT NULL,
            created_at DATETIME DEFAULT (datetime('now'))
        )");
    }

    // Insert a new interaction row and return the new row id back to the controller
    public function dbInsertData(string $sport, string $type): int {
        // Prepared statement with bound parameters to prevent SQL injection
        $stmt = $this->db->prepare(
            "INSERT INTO interactions (sport, type) VALUES (:sport, :type)"
        );
        $stmt->bindParam(':sport', $sport);
        $stmt->bindParam(':type',  $type);
        $stmt->execute();
        return (int) $this->db->lastInsertId();
    }

    // Return every row, newest first, used by the stats page recent-interactions table
    public function dbGetData(): array {
        return $this->db
            ->query("SELECT id, sport, type, created_at FROM interactions ORDER BY id DESC")
            ->fetchAll();
    }

    // Return aggregate statistics, used by the stat boxes on the stats page
    public function dbGetStats(): array {
        // Total number of interactions ever recorded
        $total = (int) $this->db
            ->query("SELECT COUNT(*) FROM interactions")
            ->fetchColumn();

        // Count grouped by sport (tennis / basketball / football)
        $bySport = [];
        foreach ($this->db->query("SELECT sport, COUNT(*) AS cnt FROM interactions GROUP BY sport") as $row) {
            $bySport[$row['sport']] = (int) $row['cnt'];
        }

        // Count grouped by action type (hit / shoot / dribble etc)
        $byType = [];
        foreach ($this->db->query("SELECT type, COUNT(*) AS cnt FROM interactions GROUP BY type") as $row) {
            $byType[$row['type']] = (int) $row['cnt'];
        }

        // The 20 most recent interactions, used for the table at the bottom of the stats page
        $recent = $this->db
            ->query("SELECT sport, type, created_at FROM interactions ORDER BY id DESC LIMIT 20")
            ->fetchAll();

        return [
            'total'    => $total,
            'by_sport' => $bySport,
            'by_type'  => $byType,
            'recent'   => $recent,
        ];
    }
}
