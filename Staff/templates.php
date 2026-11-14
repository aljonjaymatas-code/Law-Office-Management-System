<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_layout.php';

$user = staff_require_auth($pdo);
$uploadDirectory = __DIR__ . '/template_uploads';
$previewDirectory = __DIR__ . '/template_previews';
$maxPreviewSize = 2 * 1024 * 1024;
const STAFF_TEMPLATE_MAX_DELTA_SIZE = 5 * 1024 * 1024;
const STAFF_TEMPLATE_MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const STAFF_TEMPLATE_MAX_TOTAL_IMAGE_SIZE = 3 * 1024 * 1024;
$maxDeltaSize = STAFF_TEMPLATE_MAX_DELTA_SIZE;
$categories = [
    'Client Intake',
    'Court Filings',
    'Contracts & Agreements',
    'Correspondence',
    'Other',
];

function staff_template_sanitize_delta(mixed $rawDelta): ?string
{
    if (!is_string($rawDelta) || strlen($rawDelta) > STAFF_TEMPLATE_MAX_DELTA_SIZE) {
        return null;
    }

    try {
        $decoded = json_decode($rawDelta, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        return null;
    }
    if (!is_array($decoded) || !is_array($decoded['ops'] ?? null) || count($decoded['ops']) > 10000) {
        return null;
    }

    $cleanOps = [];
    $plainText = '';
    $totalImageSize = 0;
    $hasImage = false;
    foreach ($decoded['ops'] as $operation) {
        if (!is_array($operation)) {
            return null;
        }

        $insert = $operation['insert'] ?? null;
        if (is_string($insert)) {
            $plainText .= $insert;
            if (strlen($plainText) > 100000) {
                return null;
            }
            $cleanOperation = ['insert' => $insert];
        } elseif (
            is_array($insert)
            && count($insert) === 1
            && is_string($insert['image'] ?? null)
            && preg_match('~\Adata:image/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})\z~i', $insert['image'], $imageMatch) === 1
        ) {
            $imageBytes = base64_decode($imageMatch[2], true);
            $imageType = strtolower($imageMatch[1]);
            if (
                $imageBytes === false
                || strlen($imageBytes) === 0
                || strlen($imageBytes) > STAFF_TEMPLATE_MAX_IMAGE_SIZE
                || $totalImageSize + strlen($imageBytes) > STAFF_TEMPLATE_MAX_TOTAL_IMAGE_SIZE
                || !staff_template_image_matches_mime($imageBytes, $imageType)
            ) {
                return null;
            }
            $totalImageSize += strlen($imageBytes);
            $hasImage = true;
            $cleanOperation = ['insert' => ['image' => 'data:image/' . $imageType . ';base64,' . base64_encode($imageBytes)]];
        } else {
            return null;
        }

        $attributes = $operation['attributes'] ?? null;
        if (is_array($attributes)) {
            $cleanAttributes = [];
            foreach (['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'] as $format) {
                if (($attributes[$format] ?? null) === true) {
                    $cleanAttributes[$format] = true;
                }
            }
            if (in_array($attributes['header'] ?? null, [1, 2, 3], true)) {
                $cleanAttributes['header'] = $attributes['header'];
            }
            if (in_array($attributes['list'] ?? null, ['ordered', 'bullet'], true)) {
                $cleanAttributes['list'] = $attributes['list'];
            }
            if (in_array($attributes['align'] ?? null, ['center', 'right', 'justify'], true)) {
                $cleanAttributes['align'] = $attributes['align'];
            }
            if (is_int($attributes['indent'] ?? null) && $attributes['indent'] >= 1 && $attributes['indent'] <= 8) {
                $cleanAttributes['indent'] = $attributes['indent'];
            }
            if (($attributes['direction'] ?? null) === 'rtl') {
                $cleanAttributes['direction'] = 'rtl';
            }
            $link = $attributes['link'] ?? null;
            if (
                is_string($link)
                && strlen($link) <= 2048
                && filter_var($link, FILTER_VALIDATE_URL) !== false
                && in_array(strtolower((string) parse_url($link, PHP_URL_SCHEME)), ['http', 'https'], true)
            ) {
                $cleanAttributes['link'] = $link;
            }
            if ($cleanAttributes !== []) {
                $cleanOperation['attributes'] = $cleanAttributes;
            }
        }
        $cleanOps[] = $cleanOperation;
    }

    if ($cleanOps === [] || (trim($plainText) === '' && !$hasImage)) {
        return null;
    }

    try {
        return json_encode(
            ['ops' => $cleanOps],
            JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR
        );
    } catch (JsonException) {
        return null;
    }
}

function staff_template_image_matches_mime(string $imageBytes, string $imageType): bool
{
    return match ($imageType) {
        'png' => substr($imageBytes, 0, 8) === "\x89PNG\r\n\x1a\n",
        'jpeg' => substr($imageBytes, 0, 3) === "\xFF\xD8\xFF",
        'gif' => in_array(substr($imageBytes, 0, 6), ['GIF87a', 'GIF89a'], true),
        'webp' => substr($imageBytes, 0, 4) === 'RIFF' && substr($imageBytes, 8, 4) === 'WEBP',
        default => false,
    };
}

function staff_template_remove_stored_file(string $directory, mixed $storedFileName): bool
{
    if (!is_string($storedFileName) || trim($storedFileName) === '') {
        return true;
    }

    $safeName = basename(str_replace('\\', '/', $storedFileName));
    if ($safeName === '' || $safeName === '.' || $safeName === '..') {
        return false;
    }

    $root = realpath($directory);
    if ($root === false) {
        return !is_dir($directory);
    }

    $filePath = realpath($root . DIRECTORY_SEPARATOR . $safeName);
    if ($filePath === false) {
        return true;
    }
    if (dirname($filePath) !== $root || !is_file($filePath)) {
        return false;
    }

    return unlink($filePath);
}

function staff_template_delta_text(mixed $rawDelta): string
{
    if (!is_string($rawDelta)) {
        return '';
    }

    try {
        $decoded = json_decode($rawDelta, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException $exception) {
        error_log('Unable to decode a saved rich-text template Delta: ' . $exception->getMessage());
        return '';
    }

    if (!is_array($decoded) || !is_array($decoded['ops'] ?? null)) {
        error_log('A saved rich-text template has an invalid Delta structure.');
        return '';
    }

    $text = '';
    foreach ($decoded['ops'] as $operation) {
        if (is_array($operation) && is_string($operation['insert'] ?? null)) {
            $text .= $operation['insert'];
        }
    }

    return $text;
}

$error = '';
$previewFormError = '';
$previewFormTemplate = null;
$previewFormTemplateId = null;
$richFormOpen = isset($_GET['new']);
$richFormError = '';
$richFormTemplateId = null;
$richFormTemplate = null;
$richFormDelta = ['ops' => [['insert' => "\n"]]];
$viewTemplate = null;
$viewTemplateDelta = null;

if (isset($_GET['download'])) {
    http_response_code(410);
    exit('Template downloads are disabled. Open the template from the Staff library.');
}

if (isset($_GET['preview'])) {
    $templateId = filter_var($_GET['preview'], FILTER_VALIDATE_INT);
    if ($templateId === false || $templateId === null || $templateId < 1) {
        http_response_code(400);
        exit('Invalid template ID.');
    }

    $previewStatement = $pdo->prepare(
        'SELECT TOP (1) original_file_name, stored_file_name,
                preview_file_name, preview_stored_file_name
         FROM dbo.document_templates
         WHERE template_id = :template_id
           AND content_delta IS NULL'
    );
    $previewStatement->execute(['template_id' => $templateId]);
    $template = $previewStatement->fetch();
    if (!is_array($template)) {
        http_response_code(404);
        exit('Template not found.');
    }

    $originalName = basename((string) $template['original_file_name']);
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $inlineTypes = [
        'pdf' => 'application/pdf',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'txt' => 'text/plain; charset=UTF-8',
    ];
    $useThumbnail = !isset($inlineTypes[$extension])
        && is_string($template['preview_stored_file_name'])
        && $template['preview_stored_file_name'] !== '';
    $sourceDirectory = $useThumbnail ? $previewDirectory : $uploadDirectory;
    $sourceName = $useThumbnail
        ? basename(str_replace('\\', '/', (string) $template['preview_stored_file_name']))
        : basename(str_replace('\\', '/', (string) $template['stored_file_name']));
    $sourceExtension = $useThumbnail
        ? strtolower(pathinfo((string) $template['preview_file_name'], PATHINFO_EXTENSION))
        : $extension;
    $mimeType = $useThumbnail
        ? match ($sourceExtension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            default => '',
        }
        : ($inlineTypes[$sourceExtension] ?? '');
    $sourceRoot = realpath($sourceDirectory);
    $filePath = $sourceRoot !== false && $sourceName !== ''
        ? realpath($sourceRoot . DIRECTORY_SEPARATOR . $sourceName)
        : false;

    if ($mimeType === '' || $sourceRoot === false || $filePath === false || dirname($filePath) !== $sourceRoot || !is_file($filePath)) {
        http_response_code($mimeType === '' ? 415 : 404);
        exit($mimeType === '' ? 'A preview is not available for this template.' : 'Template preview not found.');
    }

    $displayName = $useThumbnail
        ? basename((string) $template['preview_file_name'])
        : $originalName;
    $fallbackName = preg_replace('/[^A-Za-z0-9._-]/', '_', $displayName);
    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . (string) filesize($filePath));
    header(
        'Content-Disposition: inline; filename="' . ($fallbackName !== '' ? $fallbackName : 'template-preview') .
        '"; filename*=UTF-8\'\'' . rawurlencode($displayName)
    );
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    readfile($filePath);
    exit;
}

if (isset($_GET['view']) || isset($_GET['edit'])) {
    $isEditingRichTemplate = isset($_GET['edit']);
    $requestedRichTemplateId = filter_var(
        $_GET[$isEditingRichTemplate ? 'edit' : 'view'],
        FILTER_VALIDATE_INT
    );
    if ($requestedRichTemplateId === false || $requestedRichTemplateId === null || $requestedRichTemplateId < 1) {
        $error = 'Select a valid rich-text template.';
    } else {
        $richTemplateStatement = $pdo->prepare(
            'SELECT TOP (1) template_id, title, category, description, content_delta
             FROM dbo.document_templates
             WHERE template_id = :template_id
               AND content_delta IS NOT NULL'
        );
        $richTemplateStatement->execute(['template_id' => $requestedRichTemplateId]);
        $richTemplate = $richTemplateStatement->fetch();
        if (!is_array($richTemplate)) {
            $error = 'That rich-text template could not be found.';
        } else {
            $safeDelta = staff_template_sanitize_delta((string) $richTemplate['content_delta']);
            if ($safeDelta === null) {
                $error = 'This template content is invalid and cannot be displayed.';
                error_log('A saved rich-text template failed Delta validation.');
            } elseif ($isEditingRichTemplate) {
                $richFormOpen = true;
                $richFormTemplateId = (int) $richTemplate['template_id'];
                $richFormTemplate = $richTemplate;
                $richFormDelta = json_decode($safeDelta, true, 64, JSON_THROW_ON_ERROR);
            } else {
                $viewTemplate = $richTemplate;
                $viewTemplateDelta = json_decode($safeDelta, true, 64, JSON_THROW_ON_ERROR);
            }
        }
    }
}

if (isset($_GET['thumbnail'])) {
    $previewFormTemplateId = filter_var($_GET['thumbnail'], FILTER_VALIDATE_INT);
    if ($previewFormTemplateId === false || $previewFormTemplateId === null || $previewFormTemplateId < 1) {
        $previewFormTemplateId = null;
        $previewFormError = 'Select a valid template.';
    } else {
        $previewTemplateStatement = $pdo->prepare(
            'SELECT TOP (1) template_id, title, preview_file_name, preview_stored_file_name
             FROM dbo.document_templates
             WHERE template_id = :template_id
               AND content_delta IS NULL'
        );
        $previewTemplateStatement->execute(['template_id' => $previewFormTemplateId]);
        $previewFormTemplate = $previewTemplateStatement->fetch();
        if (!is_array($previewFormTemplate)) {
            $previewFormTemplateId = null;
            $previewFormError = 'That template could not be found.';
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete_template') {
    $templateIdInput = $_POST['template_id'] ?? null;
    $templateId = is_string($templateIdInput) ? filter_var($templateIdInput, FILTER_VALIDATE_INT) : false;
    if (!staff_csrf_is_valid($_POST['_csrf'] ?? null)) {
        $error = 'Your session has expired. Refresh the page and try again.';
    } elseif ($templateId === false || $templateId === null || $templateId < 1) {
        $error = 'Select a valid template to remove.';
    } else {
        $deleteTemplateLookup = $pdo->prepare(
            'SELECT TOP (1) template_id, stored_file_name, preview_stored_file_name
             FROM dbo.document_templates
             WHERE template_id = :template_id'
        );
        $deleteTemplateLookup->execute(['template_id' => $templateId]);
        $templateToRemove = $deleteTemplateLookup->fetch();
        if (!is_array($templateToRemove)) {
            $error = 'That template could not be found.';
        } else {
            $deleteTemplate = $pdo->prepare(
                'DELETE FROM dbo.document_templates
                 WHERE template_id = :template_id'
            );
            $deleteTemplate->execute(['template_id' => $templateId]);
            if ($deleteTemplate->rowCount() !== 1) {
                $error = 'The template could not be removed. Refresh the page and try again.';
            } else {
                $filesRemoved = true;
                foreach ([
                    [$uploadDirectory, $templateToRemove['stored_file_name'] ?? null],
                    [$previewDirectory, $templateToRemove['preview_stored_file_name'] ?? null],
                ] as [$directory, $storedFileName]) {
                    if (!staff_template_remove_stored_file($directory, $storedFileName)) {
                        $filesRemoved = false;
                        error_log('A stored template file could not be removed after deleting its template record.');
                    }
                }
                staff_redirect_with_flash(
                    $filesRemoved
                        ? 'Template removed from the shared library.'
                        : 'Template removed, but a stored file could not be deleted. Contact an administrator.'
                );
            }
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'update_preview') {
    $previewIdInput = $_POST['template_id'] ?? null;
    $previewFormTemplateId = is_string($previewIdInput)
        ? filter_var($previewIdInput, FILTER_VALIDATE_INT)
        : false;
    if (!staff_csrf_is_valid($_POST['_csrf'] ?? null)) {
        $previewFormError = 'Your session has expired. Refresh the page and try again.';
    } elseif ($previewFormTemplateId === false || $previewFormTemplateId === null || $previewFormTemplateId < 1) {
        $previewFormError = 'Select a valid template.';
    } else {
        $previewTemplateStatement = $pdo->prepare(
            'SELECT TOP (1) template_id, title, preview_file_name, preview_stored_file_name
             FROM dbo.document_templates
             WHERE template_id = :template_id
               AND content_delta IS NULL'
        );
        $previewTemplateStatement->execute(['template_id' => $previewFormTemplateId]);
        $previewFormTemplate = $previewTemplateStatement->fetch();
        $previewFile = $_FILES['preview_file'] ?? null;
        $previewUploadError = is_array($previewFile)
            ? (int) ($previewFile['error'] ?? UPLOAD_ERR_NO_FILE)
            : UPLOAD_ERR_NO_FILE;

        if (!is_array($previewFormTemplate)) {
            $previewFormTemplateId = null;
            $previewFormError = 'That template could not be found.';
        } elseif ($previewUploadError !== UPLOAD_ERR_OK) {
            $previewFormError = match ($previewUploadError) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The preview image exceeds the server upload size limit.',
                UPLOAD_ERR_PARTIAL => 'The preview image upload was incomplete. Please try again.',
                UPLOAD_ERR_NO_FILE => 'Choose a JPG or PNG preview image.',
                UPLOAD_ERR_NO_TMP_DIR, UPLOAD_ERR_CANT_WRITE => 'The server could not receive the preview image.',
                default => 'The preview image could not be uploaded. Please try again.',
            };
        } elseif ((int) $previewFile['size'] > $maxPreviewSize) {
            $previewFormError = 'Preview images must be 2 MB or smaller.';
        } elseif (strlen(basename((string) $previewFile['name'])) > 255) {
            $previewFormError = 'The preview image filename must be 255 characters or fewer.';
        } else {
            $previewExtension = strtolower(pathinfo((string) $previewFile['name'], PATHINFO_EXTENSION));
            $previewMimeType = (new finfo(FILEINFO_MIME_TYPE))->file((string) $previewFile['tmp_name']);
            if (
                !in_array($previewExtension, ['jpg', 'jpeg', 'png'], true)
                || !in_array($previewMimeType, ['image/jpeg', 'image/png'], true)
            ) {
                $previewFormError = 'Choose a JPG or PNG preview image.';
            } elseif (!is_uploaded_file((string) $previewFile['tmp_name'])) {
                $previewFormError = 'The preview image could not be verified.';
            } elseif (!is_dir($previewDirectory) && !mkdir($previewDirectory, 0750, true) && !is_dir($previewDirectory)) {
                $previewFormError = 'The server could not prepare secure preview storage.';
            } else {
                $previewStoredName = bin2hex(random_bytes(16)) . '.' . $previewExtension;
                $previewDestination = $previewDirectory . DIRECTORY_SEPARATOR . $previewStoredName;
                if (!move_uploaded_file((string) $previewFile['tmp_name'], $previewDestination)) {
                    $previewFormError = 'The server could not save the preview image.';
                } else {
                    try {
                        $updatePreviewStatement = $pdo->prepare(
                            'UPDATE dbo.document_templates
                             SET preview_file_name = :preview_file_name,
                                 preview_stored_file_name = :preview_stored_file_name,
                                 uploaded_by = :uploaded_by,
                                 updated_at = SYSUTCDATETIME()
                             WHERE template_id = :template_id'
                        );
                        $updatePreviewStatement->execute([
                            'preview_file_name' => basename((string) $previewFile['name']),
                            'preview_stored_file_name' => $previewStoredName,
                            'uploaded_by' => (int) $user['user_id'],
                            'template_id' => $previewFormTemplateId,
                        ]);
                        if ($updatePreviewStatement->rowCount() !== 1) {
                            if (is_file($previewDestination) && !unlink($previewDestination)) {
                                error_log('Failed to remove a preview image after its template record could not be updated.');
                            }
                            $previewFormError = 'The template could not be updated. Refresh the page and try again.';
                        } else {
                            $oldPreviewName = basename(str_replace('\\', '/', (string) ($previewFormTemplate['preview_stored_file_name'] ?? '')));
                            $previewRoot = realpath($previewDirectory);
                            $oldPreviewPath = $previewRoot !== false && $oldPreviewName !== ''
                                ? realpath($previewRoot . DIRECTORY_SEPARATOR . $oldPreviewName)
                                : false;
                            if ($previewRoot !== false && $oldPreviewPath !== false && dirname($oldPreviewPath) === $previewRoot && is_file($oldPreviewPath) && !unlink($oldPreviewPath)) {
                                error_log('Failed to remove a replaced template preview image.');
                            }
                            staff_redirect_with_flash('Template preview updated.');
                        }
                    } catch (Throwable $exception) {
                        if (is_file($previewDestination) && !unlink($previewDestination)) {
                            error_log('Failed to remove a preview image after its template record could not be updated.');
                        }
                        throw $exception;
                    }
                }
            }
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'save_rich_text') {
    $richFormOpen = true;
    $titleInput = $_POST['title'] ?? null;
    $categoryInput = $_POST['category'] ?? null;
    $descriptionInput = $_POST['description'] ?? null;
    $title = is_string($titleInput) ? trim($titleInput) : '';
    $category = is_string($categoryInput) ? trim($categoryInput) : '';
    $description = is_string($descriptionInput) ? trim($descriptionInput) : '';
    $deltaInput = $_POST['content_delta'] ?? null;
    $templateIdInput = $_POST['template_id'] ?? '';
    $richFormTemplateId = null;
    $richFormTemplate = [
        'title' => $title,
        'category' => $category,
        'description' => $description,
    ];

    if (!staff_csrf_is_valid($_POST['_csrf'] ?? null)) {
        $richFormError = 'Your session has expired. Refresh the page and try again.';
    } elseif (!is_string($templateIdInput)) {
        $richFormError = 'The template request is invalid.';
    } elseif ($templateIdInput !== '' && (($richFormTemplateId = filter_var($templateIdInput, FILTER_VALIDATE_INT)) === false || $richFormTemplateId < 1)) {
        $richFormError = 'Select a valid template to edit.';
    } elseif ($title === '' || strlen($title) > 150) {
        $richFormError = 'Enter a template name up to 150 characters.';
    } elseif (!in_array($category, $categories, true)) {
        $richFormError = 'Choose a valid template category.';
    } elseif (strlen($description) > 1000) {
        $richFormError = 'The description must be 1,000 characters or fewer.';
    } elseif (!is_string($deltaInput) || strlen($deltaInput) > $maxDeltaSize) {
        $richFormError = 'Template content must be 5 MB or smaller.';
    } else {
        $cleanDelta = staff_template_sanitize_delta($deltaInput);
        if ($cleanDelta === null) {
            $richFormError = 'Add text or paste supported PNG, JPEG, GIF, or WebP images. Each image must be 2 MB or smaller, with 3 MB total image content.';
        } else {
            $richFormDelta = json_decode($cleanDelta, true, 64, JSON_THROW_ON_ERROR);
        }
    }

    if ($richFormError === '' && $cleanDelta !== null) {
        if ($richFormTemplateId !== null) {
            $saveTemplate = $pdo->prepare(
                'UPDATE dbo.document_templates
                 SET title = :title,
                     category = :category,
                     description = :description,
                     content_delta = :content_delta,
                     uploaded_by = :uploaded_by,
                     updated_at = SYSUTCDATETIME()
                 WHERE template_id = :template_id
                   AND content_delta IS NOT NULL'
            );
            $saveTemplate->execute([
                'title' => $title,
                'category' => $category,
                'description' => $description !== '' ? $description : null,
                'content_delta' => $cleanDelta,
                'uploaded_by' => (int) $user['user_id'],
                'template_id' => $richFormTemplateId,
            ]);
            if ($saveTemplate->rowCount() !== 1) {
                $richFormError = 'That rich-text template could not be updated.';
            } else {
                staff_redirect_with_flash('Rich-text template updated.');
            }
        } else {
            $saveTemplate = $pdo->prepare(
                'INSERT INTO dbo.document_templates (
                    title, category, description, original_file_name, stored_file_name,
                    content_delta, uploaded_by
                 ) VALUES (
                    :title, :category, :description, NULL, NULL,
                    :content_delta, :uploaded_by
                 )'
            );
            $saveTemplate->execute([
                'title' => $title,
                'category' => $category,
                'description' => $description !== '' ? $description : null,
                'content_delta' => $cleanDelta,
                'uploaded_by' => (int) $user['user_id'],
            ]);
            staff_redirect_with_flash('Rich-text template shared with the staff team.');
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $error = 'Invalid template request.';
}

$selectedCategory = is_string($_GET['category'] ?? null) && in_array($_GET['category'], $categories, true)
    ? $_GET['category']
    : '';
$search = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
$templatesStatement = $pdo->query(
    'SELECT t.template_id, t.title, t.category, t.description, t.original_file_name,
            t.content_delta, t.preview_file_name, t.preview_stored_file_name,
            t.created_at, t.updated_at, u.username AS uploaded_by_name
     FROM dbo.document_templates t
     LEFT JOIN dbo.users u ON u.user_id = t.uploaded_by
     ORDER BY t.updated_at DESC, t.template_id DESC'
);
$allTemplates = $templatesStatement->fetchAll();
foreach ($allTemplates as &$template) {
    $template['content_text'] = staff_template_delta_text($template['content_delta'] ?? null);
}
unset($template);
$templates = array_values(array_filter(
    $allTemplates,
    static function (array $template) use ($selectedCategory, $search): bool {
        if ($selectedCategory !== '' && $template['category'] !== $selectedCategory) {
            return false;
        }
        if ($search === '') {
            return true;
        }

        return stripos(
            implode(' ', [
                (string) $template['title'],
                (string) $template['category'],
                (string) ($template['description'] ?? ''),
                (string) ($template['original_file_name'] ?? ''),
                (string) $template['content_text'],
            ]),
            $search
        ) !== false;
    }
));
$categoryCounts = array_fill_keys($categories, 0);
foreach ($allTemplates as $template) {
    if (isset($categoryCounts[$template['category']])) {
        $categoryCounts[$template['category']]++;
    }
}

staff_layout_start(
    'Template Library',
    $user,
    'templates.php',
    staff_take_flash(),
    $error,
    'Create Template',
    'template-submit-form',
    ['https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css'],
    ['https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js']
);
?>
<style>
    #template-submit-form:not([open]) { display: none; }
    #template-submit-form[open] { display: flex; }
    #template-rich-editor .ql-editor { min-height: 20rem; background: #fff; color: #0f172a; }
    #template-submit-form .ql-toolbar.ql-snow,
    #template-rich-editor.ql-container.ql-snow { border-color: #475569; }
    #template-submit-form .ql-toolbar.ql-snow { background: #f8fafc; }
    #template-read-editor .ql-editor { min-height: 20rem; background: #fff; color: #0f172a; }
</style>

<dialog id="template-submit-form" data-floating-form data-open-on-load="<?php echo $richFormOpen ? 'true' : 'false'; ?>" aria-labelledby="template-submit-title" class="m-auto flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm">
    <section class="<?php echo staff_panel_class(); ?> flex min-h-0 flex-col">
        <div class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 p-5">
            <div>
                <h2 id="template-submit-title" class="text-xl font-bold text-white"><?php echo $richFormTemplateId !== null ? 'Edit Rich-Text Template' : 'Create Rich-Text Template'; ?></h2>
                <p class="mt-1 text-sm text-slate-400">Create and share an office template staff can read in the portal.</p>
            </div>
            <button type="button" data-dialog-close aria-label="Close template form" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                <i data-lucide="x" class="h-5 w-5"></i>
            </button>
        </div>
        <?php if ($richFormError !== ''): ?>
            <p role="alert" class="mx-5 mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><?php echo staff_h($richFormError); ?></p>
        <?php endif; ?>
        <form id="template-rich-form" method="post" action="templates.php" autocomplete="off" class="flex min-h-0 flex-1 flex-col">
            <?php staff_csrf_field(); ?>
            <input type="hidden" name="action" value="save_rich_text">
            <input type="hidden" name="template_id" value="<?php echo $richFormTemplateId !== null ? (int) $richFormTemplateId : ''; ?>">
            <input id="template-content-delta" type="hidden" name="content_delta" value="<?php echo staff_h(json_encode($richFormDelta, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT)); ?>">
            <div id="template-rich-content-scroll" class="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5">
            <div>
                <label for="template-title" class="mb-1 block text-sm font-medium text-slate-200">Template Name <span class="text-amber-400">*</span></label>
                <input id="template-title" name="title" type="text" autocomplete="off" required maxlength="150" value="<?php echo staff_h($richFormTemplate['title'] ?? ''); ?>" class="<?php echo staff_input_class(); ?>">
            </div>
            <div>
                <label for="template-category" class="mb-1 block text-sm font-medium text-slate-200">Category <span class="text-amber-400">*</span></label>
                <select id="template-category" name="category" required class="<?php echo staff_input_class(); ?>">
                    <option value="">Select a category</option>
                    <?php foreach ($categories as $category): ?>
                        <option value="<?php echo staff_h($category); ?>" <?php echo ($richFormTemplate['category'] ?? '') === $category ? 'selected' : ''; ?>><?php echo staff_h($category); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label for="template-description" class="mb-1 block text-sm font-medium text-slate-200">Description</label>
                <textarea id="template-description" name="description" rows="3" maxlength="1000" class="<?php echo staff_input_class(); ?>"><?php echo staff_h($richFormTemplate['description'] ?? ''); ?></textarea>
            </div>
            <div>
                <span class="mb-1 block text-sm font-medium text-slate-200">Template Content <span class="text-amber-400">*</span></span>
                <div id="template-rich-editor" role="textbox" aria-label="Template content editor" class="overflow-hidden rounded-lg bg-white"></div>
                <p id="template-editor-load-error" role="alert" hidden class="mt-2 text-sm text-red-300">The rich-text editor could not load. Check your connection and refresh before saving.</p>
                <p id="template-image-paste-error" role="alert" hidden class="mt-2 text-sm text-red-300"></p>
                <p class="mt-2 text-xs text-slate-500">Use the toolbar for headings, lists, emphasis, links, and alignment. Paste PNG, JPEG, GIF, or WebP images up to 2 MB each (3 MB total). Templates are stored in the system and shown in your browser, not downloaded as files.</p>
            </div>
            </div>
            <div class="flex shrink-0 justify-end border-t border-slate-800 bg-slate-900/95 p-4 backdrop-blur-sm">
                <button type="submit" class="rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:from-amber-500 hover:to-amber-400">Save Template</button>
            </div>
        </form>
    </section>
</dialog>

<dialog id="template-read-form" data-floating-form data-open-on-load="<?php echo $viewTemplate !== null ? 'true' : 'false'; ?>" aria-labelledby="template-read-title" class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-2xl border border-amber-500/30 bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm">
    <section class="<?php echo staff_panel_class(); ?>">
        <div class="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
            <div>
                <h2 id="template-read-title" class="text-xl font-bold text-white"><?php echo staff_h($viewTemplate['title'] ?? 'Template'); ?></h2>
                <p class="mt-1 text-sm text-slate-400"><?php echo staff_h($viewTemplate['description'] ?? 'Read-only template preview'); ?></p>
            </div>
            <button type="button" data-dialog-close aria-label="Close template preview" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                <i data-lucide="x" class="h-5 w-5"></i>
            </button>
        </div>
        <?php if ($viewTemplate !== null): ?>
            <div id="template-read-editor" class="m-5 overflow-hidden rounded-lg bg-white"></div>
            <script id="template-read-delta" type="application/json"><?php echo json_encode($viewTemplateDelta, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?></script>
        <?php endif; ?>
    </section>
</dialog>

<dialog id="template-preview-form" data-floating-form data-open-on-load="<?php echo $previewFormTemplate !== null || $previewFormError !== '' ? 'true' : 'false'; ?>" aria-labelledby="template-preview-title" class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-amber-500/30 bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm">
    <section class="<?php echo staff_panel_class(); ?>">
        <div class="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
            <div>
                <h2 id="template-preview-title" class="text-xl font-bold text-white">Template Preview</h2>
                <p class="mt-1 text-sm text-slate-400"><?php echo staff_h($previewFormTemplate['title'] ?? 'Add a thumbnail to show the document content in the gallery.'); ?></p>
            </div>
            <button type="button" data-dialog-close aria-label="Close preview form" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                <i data-lucide="x" class="h-5 w-5"></i>
            </button>
        </div>
        <?php if ($previewFormError !== ''): ?>
            <p role="alert" class="mx-5 mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><?php echo staff_h($previewFormError); ?></p>
        <?php endif; ?>
        <?php if ($previewFormTemplate !== null): ?>
            <form method="post" action="templates.php?thumbnail=<?php echo (int) $previewFormTemplateId; ?>" enctype="multipart/form-data" class="space-y-4 p-5">
                <?php staff_csrf_field(); ?>
                <input type="hidden" name="action" value="update_preview">
                <input type="hidden" name="template_id" value="<?php echo (int) $previewFormTemplateId; ?>">
                <?php if (!empty($previewFormTemplate['preview_stored_file_name'])): ?>
                    <img src="templates.php?preview=<?php echo (int) $previewFormTemplateId; ?>" alt="Current preview for <?php echo staff_h($previewFormTemplate['title']); ?>" class="max-h-48 w-full rounded-lg border border-slate-700 bg-white object-contain">
                <?php endif; ?>
                <div>
                    <label for="replacement-preview-file" class="mb-1 block text-sm font-medium text-slate-200">JPG or PNG Thumbnail <span class="text-amber-400">*</span></label>
                    <input id="replacement-preview-file" name="preview_file" type="file" required accept=".jpg,.jpeg,.png,image/jpeg,image/png" class="<?php echo staff_input_class(); ?>">
                    <p class="mt-1 text-xs text-slate-500">Upload a clear image of the template page; maximum 2 MB. This replaces the existing thumbnail, not the original template.</p>
                </div>
                <div class="flex justify-end">
                    <button type="submit" class="rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:from-amber-500 hover:to-amber-400">Save Preview</button>
                </div>
            </form>
        <?php endif; ?>
    </section>
</dialog>

<section class="<?php echo staff_panel_class(); ?>">
    <div class="border-b border-slate-800 p-5 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
                <h2 class="font-bold tracking-wide text-white">Shared Template Gallery</h2>
                <p class="mt-1 max-w-3xl text-sm text-slate-400">Create, search, preview, and edit shared templates inside the staff portal. Rich-text templates stay in the browser instead of downloading as files.</p>
            </div>
            <span class="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <?php echo count($allTemplates); ?> shared template<?php echo count($allTemplates) === 1 ? '' : 's'; ?>
            </span>
        </div>
        <form method="get" action="templates.php" class="mt-5 flex flex-col gap-3 sm:flex-row">
            <?php if ($selectedCategory !== ''): ?>
                <input type="hidden" name="category" value="<?php echo staff_h($selectedCategory); ?>">
            <?php endif; ?>
            <label for="template-search" class="sr-only">Search templates</label>
            <input id="template-search" name="q" type="search" value="<?php echo staff_h($search); ?>" placeholder="Search templates by name, category, or description" class="<?php echo staff_input_class(); ?>">
            <button type="submit" class="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-300">Search</button>
        </form>
    </div>
    <nav aria-label="Template categories" class="flex flex-wrap gap-2 border-b border-slate-800 p-5">
        <a href="templates.php<?php echo $search !== '' ? '?q=' . rawurlencode($search) : ''; ?>" aria-current="<?php echo $selectedCategory === '' ? 'page' : 'false'; ?>" class="rounded-full border px-3 py-1.5 text-xs font-semibold transition <?php echo $selectedCategory === '' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'; ?>">
            All templates <span class="ml-1 opacity-70"><?php echo count($allTemplates); ?></span>
        </a>
        <?php foreach ($categories as $category): ?>
            <a href="templates.php?category=<?php echo rawurlencode($category); ?><?php echo $search !== '' ? '&q=' . rawurlencode($search) : ''; ?>" aria-current="<?php echo $selectedCategory === $category ? 'page' : 'false'; ?>" class="rounded-full border px-3 py-1.5 text-xs font-semibold transition <?php echo $selectedCategory === $category ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'; ?>">
                <?php echo staff_h($category); ?><span class="ml-1 opacity-70"><?php echo (int) $categoryCounts[$category]; ?></span>
            </a>
        <?php endforeach; ?>
    </nav>
    <?php if ($templates === []): ?>
        <div class="p-8 text-center">
            <i data-lucide="files" class="mx-auto h-8 w-8 text-slate-500"></i>
            <h3 class="mt-3 font-semibold text-white"><?php echo $allTemplates === [] ? 'No shared templates yet' : 'No templates match your search'; ?></h3>
            <p class="mt-1 text-sm text-slate-400"><?php echo $allTemplates === [] ? 'Submit your first office template to create the shared gallery.' : 'Try a different search or category.'; ?></p>
        </div>
    <?php else: ?>
        <div class="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            <?php foreach ($templates as $template): ?>
                <?php
                $isRichTextTemplate = $template['content_delta'] !== null;
                $templateExtension = strtolower(pathinfo((string) ($template['original_file_name'] ?? ''), PATHINFO_EXTENSION));
                $templateId = (int) $template['template_id'];
                $templateHasThumbnail = !empty($template['preview_stored_file_name']);
                $hasInlinePreview = in_array($templateExtension, ['pdf', 'txt', 'jpg', 'jpeg', 'png'], true) || $templateHasThumbnail;
                ?>
                <article class="flex flex-col rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-amber-500/30">
                    <div class="relative h-52 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                        <?php if ($isRichTextTemplate): ?>
                            <div class="h-full overflow-hidden bg-white p-5 text-sm leading-6 text-slate-800">
                                <?php echo nl2br(staff_h(substr((string) $template['content_text'], 0, 700))); ?>
                            </div>
                        <?php elseif (in_array($templateExtension, ['jpg', 'jpeg', 'png'], true)): ?>
                            <img src="templates.php?preview=<?php echo $templateId; ?>" alt="Preview of <?php echo staff_h($template['title']); ?>" loading="lazy" class="h-full w-full object-contain bg-slate-950">
                        <?php elseif (in_array($templateExtension, ['pdf', 'txt'], true)): ?>
                            <iframe src="templates.php?preview=<?php echo $templateId; ?><?php echo $templateExtension === 'pdf' ? '#toolbar=0&navpanes=0&scrollbar=0&page=1' : ''; ?>" title="Content preview of <?php echo staff_h($template['title']); ?>" loading="lazy" class="h-full w-full border-0 bg-white"></iframe>
                            <a href="templates.php?preview=<?php echo $templateId; ?>" target="_blank" rel="noopener" class="absolute inset-0" aria-label="Open full preview of <?php echo staff_h($template['title']); ?>"></a>
                        <?php elseif ($templateHasThumbnail): ?>
                            <img src="templates.php?preview=<?php echo $templateId; ?>" alt="Preview of <?php echo staff_h($template['title']); ?>" loading="lazy" class="h-full w-full object-contain bg-slate-950">
                        <?php else: ?>
                            <div class="flex h-full flex-col justify-between bg-white p-5 text-slate-800">
                                <div>
                                    <div class="h-1 w-16 bg-amber-500"></div>
                                    <h4 class="mt-4 line-clamp-2 text-base font-semibold"><?php echo staff_h($template['title']); ?></h4>
                                    <p class="mt-2 line-clamp-4 text-xs leading-relaxed text-slate-500"><?php echo staff_h($template['description'] ?: 'Shared office template'); ?></p>
                                </div>
                                <div class="flex items-center justify-between border-t border-slate-200 pt-2 text-[10px] uppercase tracking-wide text-slate-400">
                                    <span><?php echo staff_h(strtoupper($templateExtension !== '' ? $templateExtension : 'file')); ?> document</span>
                                    <span>Preview needed</span>
                                </div>
                            </div>
                        <?php endif; ?>
                        <div class="absolute left-2 top-2 flex gap-2">
                            <span class="rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-semibold text-slate-200"><?php echo staff_h($template['category']); ?></span>
                            <span class="rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-semibold text-amber-300"><?php echo $isRichTextTemplate ? 'Rich text' : 'File preview'; ?></span>
                        </div>
                    </div>
                    <h3 class="mt-4 font-semibold text-white"><?php echo staff_h($template['title']); ?></h3>
                    <p class="mt-1 min-h-10 text-sm text-slate-400"><?php echo staff_h($template['description'] ?: 'Shared office template ready to use.'); ?></p>
                    <p class="mt-3 truncate text-xs text-slate-500" title="<?php echo $isRichTextTemplate ? 'Rich-text template stored in the system' : staff_h($template['original_file_name'] ?? ''); ?>"><?php echo $isRichTextTemplate ? 'Stored in the system' : staff_h($template['original_file_name'] ?? ''); ?></p>
                    <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                        <span class="text-[11px] text-slate-500">
                            <?php echo staff_h($template['uploaded_by_name'] ?: 'Staff'); ?>
                            · <?php echo staff_h(date('M j, Y', strtotime((string) $template['updated_at']))); ?>
                        </span>
                        <div class="flex flex-wrap items-center justify-end gap-2">
                            <?php if (!$isRichTextTemplate && !in_array($templateExtension, ['pdf', 'txt', 'jpg', 'jpeg', 'png'], true)): ?>
                                <a href="templates.php?thumbnail=<?php echo $templateId; ?>" class="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white">
                                    <?php echo $templateHasThumbnail ? 'Change preview' : 'Add preview'; ?>
                                </a>
                            <?php endif; ?>
                            <?php if ($isRichTextTemplate): ?>
                                <a href="templates.php?edit=<?php echo $templateId; ?>" class="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white">Edit</a>
                                <a href="templates.php?view=<?php echo $templateId; ?>" class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500">Open Template</a>
                            <?php elseif ($hasInlinePreview): ?>
                                <a href="templates.php?preview=<?php echo $templateId; ?>" target="_blank" rel="noopener" class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500">View Preview</a>
                            <?php else: ?>
                                <span class="px-2.5 py-2 text-xs text-slate-500">No preview available</span>
                            <?php endif; ?>
                            <form method="post" action="templates.php" data-template-delete-form data-template-title="<?php echo staff_h($template['title']); ?>" class="inline-flex">
                                <?php staff_csrf_field(); ?>
                                <input type="hidden" name="action" value="delete_template">
                                <input type="hidden" name="template_id" value="<?php echo $templateId; ?>">
                                <button type="submit" class="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-2 text-xs font-semibold text-red-300 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-200">
                                    <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
                                    Remove
                                </button>
                            </form>
                        </div>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</section>
<script id="template-editor-initial-data" type="application/json"><?php echo json_encode($richFormDelta, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-template-delete-form]').forEach((deleteForm) => {
        deleteForm.addEventListener('submit', (event) => {
            const title = deleteForm.dataset.templateTitle || 'this template';
            if (!window.confirm(`Remove "${title}" from the shared library? This cannot be undone.`)) {
                event.preventDefault();
            }
        });
    });

    const form = document.getElementById('template-rich-form');
    const editorElement = document.getElementById('template-rich-editor');
    const editorLoadError = document.getElementById('template-editor-load-error');
    const imagePasteError = document.getElementById('template-image-paste-error');
    const deltaInput = document.getElementById('template-content-delta');

    if (form && editorElement) {
        const contentScroll = document.getElementById('template-rich-content-scroll');
        form.closest('dialog').addEventListener('close', () => {
            contentScroll.scrollTop = 0;
        });
        window.requestAnimationFrame(() => {
            contentScroll.scrollTop = 0;
        });
        if (!window.Quill) {
            editorLoadError.hidden = false;
        } else {
            const editor = new window.Quill(editorElement, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        [{ align: [] }],
                        ['blockquote', 'code-block'],
                        ['link'],
                        ['clean']
                    ]
                }
            });
            editor.setContents(JSON.parse(document.getElementById('template-editor-initial-data').textContent), 'silent');
            editor.root.addEventListener('paste', async (event) => {
                const clipboardItems = Array.from(event.clipboardData?.items ?? []);
                const imageItems = clipboardItems.filter((item) => item.kind === 'file' && item.type.toLowerCase().startsWith('image/'));
                if (imageItems.length === 0) {
                    return;
                }

                event.preventDefault();
                event.stopImmediatePropagation();
                const imageFiles = imageItems.map((item) => item.getAsFile());
                const supportedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
                if (
                    imageFiles.some((file) => !file)
                    || imageFiles.some((file) => !supportedTypes.includes(file.type.toLowerCase()))
                ) {
                    imagePasteError.textContent = 'Paste a PNG, JPEG, GIF, or WebP image.';
                    imagePasteError.hidden = false;
                    return;
                }

                const totalImageSize = imageFiles.reduce((total, file) => total + file.size, 0);
                if (imageFiles.some((file) => file.size > 2 * 1024 * 1024) || totalImageSize > 3 * 1024 * 1024) {
                    imagePasteError.textContent = 'Each pasted image must be 2 MB or smaller, with 3 MB total image content.';
                    imagePasteError.hidden = false;
                    return;
                }

                const selection = editor.getSelection(true);
                let insertionIndex = selection?.index ?? editor.getLength() - 1;
                if (selection?.length) {
                    editor.deleteText(insertionIndex, selection.length, 'user');
                }
                imagePasteError.hidden = true;
                for (const file of imageFiles) {
                    const dataUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
                        reader.onerror = () => resolve(null);
                        reader.readAsDataURL(file);
                    });
                    if (typeof dataUrl !== 'string') {
                        imagePasteError.textContent = 'The pasted image could not be read. Try copying it again.';
                        imagePasteError.hidden = false;
                        return;
                    }
                    editor.insertEmbed(insertionIndex, 'image', dataUrl, 'user');
                    insertionIndex += 1;
                }
                editor.setSelection(insertionIndex, 0, 'silent');
            }, true);
            form.addEventListener('submit', (event) => {
                if (!window.Quill) {
                    event.preventDefault();
                    editorLoadError.hidden = false;
                    return;
                }
                deltaInput.value = JSON.stringify(editor.getContents());
            });
            window.requestAnimationFrame(() => {
                editor.update();
                contentScroll.scrollTop = 0;
            });
        }
    }

    const readEditorElement = document.getElementById('template-read-editor');
    const readDeltaElement = document.getElementById('template-read-delta');
    if (readEditorElement && readDeltaElement && window.Quill) {
        const readEditor = new window.Quill(readEditorElement, {
            theme: 'snow',
            readOnly: true,
            modules: { toolbar: false }
        });
        readEditor.setContents(JSON.parse(readDeltaElement.textContent), 'silent');
        window.requestAnimationFrame(() => readEditor.update());
    }
});
</script>
<?php staff_layout_end(); ?>