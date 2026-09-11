<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$input = json_decode(file_get_contents('php://input') ?: '', true);
$message = strtolower(trim((string) ($input['message'] ?? '')));
if ($message === '') {
    echo json_encode(['emotion' => 'Neutral']);
    exit;
}

$groups = [
    'Stressed' => ['stress', 'anxious', 'overwhelmed', 'panic', 'worried'],
    'Sad' => ['sad', 'low', 'lonely', 'upset', 'unhappy'],
    'Happy' => ['happy', 'great', 'excited', 'proud', 'good today'],
];
$emotion = 'Neutral';
foreach ($groups as $label => $terms) {
    foreach ($terms as $term) {
        if (str_contains($message, $term)) {
            $emotion = $label;
            break 2;
        }
    }
}
echo json_encode(['emotion' => $emotion]);
