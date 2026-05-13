<?php
// api.php — the thin entry point that routes between sport pages and the controller
// GET ?action=stats returns aggregate stats as JSON
// GET ?action=data  returns every interaction row as JSON
// GET ?action=view  returns a server-rendered HTML table (viewStats.php)
// POST              records a new interaction {sport, type}

// CORS headers so the page can call this from a different origin during development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle the preflight OPTIONS request browsers send before a POST
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/application/controller/controller.php';

// Create the controller, wrap in try/catch so a missing db file returns JSON not a stack trace
try {
    $controller = new Controller();
} catch (Exception $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// GET routes, each one returns straight away after sending its response
if ($method === 'GET') {
    if ($action === 'stats') {
        header('Content-Type: application/json');
        echo json_encode($controller->apiGetStats());
        exit;
    }

    if ($action === 'data') {
        header('Content-Type: application/json');
        echo json_encode($controller->apiGetData());
        exit;
    }

    // server-rendered HTML view, this is what makes the View layer separate from the JSON API
    if ($action === 'view') {
        header('Content-Type: text/html; charset=utf-8');
        $data = $controller->apiGetData()['data'];
        require __DIR__ . '/application/view/viewStats.php';
        exit;
    }
}

// POST route, records a new interaction from the sport pages
if ($method === 'POST') {
    header('Content-Type: application/json');
    // read the JSON body, fall back to an empty array if its missing or malformed
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $sport = (string)($body['sport'] ?? '');
    $type  = (string)($body['type']  ?? '');
    $result = $controller->apiInsertData($sport, $type);
    // 400 if the controller rejected the input
    if ($result['status'] !== 'ok') {
        http_response_code(400);
    }
    echo json_encode($result);
    exit;
}

// fallback for anything else, like a PUT or DELETE
header('Content-Type: application/json');
http_response_code(405);
echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
