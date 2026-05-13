<?php
// Controller for Sports 3D, sits between api.php (the router) and the Model
// validates user input against allowlists and then delegates to the Model
// returns plain PHP arrays, the entry point api.php handles the JSON encoding
require_once __DIR__ . '/../model/model.php';

class Controller {
    private Model $model;

    // Allowlists, anything not in here gets rejected before touching the database
    private const VALID_SPORTS = ['tennis', 'basketball', 'football'];
    private const VALID_TYPES  = ['hit', 'juggle', 'shoot', 'dribble', 'swing'];

    public function __construct() {
        $this->model = new Model();
        // create the table on first run, idempotent so safe to call every request
        $this->model->dbCreateTable();
    }

    // Validate the sport and type then insert a new interaction row
    public function apiInsertData(string $sport, string $type): array {
        // lowercase and trim so 'Tennis ' and 'tennis' both work
        $sport = strtolower(trim($sport));
        $type  = strtolower(trim($type));

        // Reject anything that isn't in the allowlist, this stops bad data getting in
        if (!in_array($sport, self::VALID_SPORTS, true)) {
            return ['status' => 'error', 'message' => 'Invalid sport'];
        }
        if (!in_array($type, self::VALID_TYPES, true)) {
            return ['status' => 'error', 'message' => 'Invalid type'];
        }

        $id = $this->model->dbInsertData($sport, $type);
        return ['status' => 'ok', 'id' => $id];
    }

    // Return aggregate statistics for the stat boxes on the stats page
    public function apiGetStats(): array {
        return array_merge(['status' => 'ok'], $this->model->dbGetStats());
    }

    // Return all interaction rows, used by the recent-interactions table
    public function apiGetData(): array {
        return ['status' => 'ok', 'data' => $this->model->dbGetData()];
    }
}
