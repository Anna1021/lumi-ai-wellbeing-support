<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$spaceUrl = rtrim((string) getenv('SANA_SPACE_URL'), '/');
if ($spaceUrl === '') {
    http_response_code(503);
    echo json_encode(['error' => 'SANA AI is not configured']);
    exit;
}

$raw = file_get_contents('php://input');
$input = json_decode($raw ?: '', true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$message = trim((string) ($input['message'] ?? ''));
if ($message === '' || mb_strlen($message) > 2000) {
    http_response_code(422);
    echo json_encode(['error' => 'Message must contain 1–2000 characters']);
    exit;
}

try {
    $payload = json_encode($input, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $startRequest = json_encode(['data' => [$payload]], JSON_UNESCAPED_UNICODE);
    $start = httpRequest($spaceUrl . '/gradio_api/call/sana_chat', 'POST', $startRequest);
    $startData = json_decode($start, true);
    $eventId = $startData['event_id'] ?? null;
    if (!is_string($eventId) || $eventId === '') throw new RuntimeException('Missing event');

    $events = httpRequest($spaceUrl . '/gradio_api/call/sana_chat/' . rawurlencode($eventId), 'GET');
    foreach (preg_split('/\R/', $events) as $line) {
        if (!str_starts_with($line, 'data: ')) continue;
        $eventData = json_decode(substr($line, 6), true);
        if (is_array($eventData) && isset($eventData[0]) && is_string($eventData[0])) {
            $response = json_decode($eventData[0], true);
            if (is_array($response)) {
                echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                exit;
            }
        }
    }
} catch (Throwable $error) {
    // Do not expose upstream details or credentials to the browser.
}
http_response_code(502);
echo json_encode(['error' => 'SANA AI is temporarily unavailable']);

function httpRequest(string $url, string $method, ?string $body = null): string {
    $headers = ['Content-Type: application/json', 'Accept: application/json, text/event-stream'];
    $token = (string) getenv('HF_TOKEN');
    if ($token !== '') $headers[] = 'Authorization: Bearer ' . $token;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_POSTFIELDS => $body,
    ]);
    $result = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (!is_string($result) || $status >= 400) throw new RuntimeException('Upstream unavailable');
    return $result;
}
