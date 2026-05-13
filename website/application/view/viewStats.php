<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Interaction Stats — Sports 3D (View Layer)</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background: #0b0e1a; color: #ddd; font-family: Arial, sans-serif; }
    /* highlighted bar that explains this is the MVC view layer */
    .view-header {
      background: rgba(100,200,255,.08); border: 1px solid rgba(100,200,255,.2);
      border-radius: 8px; padding: 12px 18px; margin-bottom: 24px;
      font-size: .85rem; color: #7ef;
    }
    th { color: #aaa; font-size: .8rem; text-transform: uppercase; letter-spacing: 2px; }
    td { color: #ccc; }
    .table-dark { --bs-table-bg: rgba(255,255,255,.03); }
  </style>
</head>
<body>
<div class="container py-4">
  <!--banner showing this is the MVC view layer-->
  <div class="view-header">
    <strong>MVC View Layer</strong> — <code>application/view/viewStats.php</code><br>
    Server-rendered HTML. Data passed from <code>Controller::apiGetData()</code> via <code>api.php?action=view</code>.
  </div>

  <h4 class="mb-3" style="color:#7ef;">Recent Interactions</h4>

  <?php if (empty($data)): ?>
    <p class="text-muted">No interactions recorded yet.</p>
  <?php else: ?>
    <!--table built server-side from the array passed in by the controller-->
    <div class="table-responsive">
      <table class="table table-dark table-hover table-sm align-middle">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">ID</th>
            <th scope="col">Sport</th>
            <th scope="col">Action</th>
            <th scope="col">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($data as $i => $row): ?>
            <tr>
              <?php // htmlspecialchars on every value to prevent XSS ?>
              <td><?= $i + 1 ?></td>
              <td><?= htmlspecialchars((string)$row['id']) ?></td>
              <td><?= htmlspecialchars($row['sport']) ?></td>
              <td><?= htmlspecialchars($row['type']) ?></td>
              <td><?= htmlspecialchars($row['created_at'] ?? '—') ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <p class="text-muted" style="font-size:.8rem;"><?= count($data) ?> record(s) shown.</p>
  <?php endif; ?>
</div>
</body>
</html>
