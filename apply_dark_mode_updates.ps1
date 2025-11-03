# Comprehensive Dark Mode Update Script for Learnora
# This script applies consistent dark mode styling across all pages

Write-Host "Applying Comprehensive Dark Mode Updates..." -ForegroundColor Cyan

$learnerWebAppPath = "c:\Users\imran\KG_CD_DKE\Learnora v1\learner-web-app\src\features"

# Define replacement patterns (old → new)
$replacements = @(
    # Background colors
    @{ Old = 'className="flex flex-col h-screen bg-gray-50"'; New = 'className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900"' },
    @{ Old = 'className="min-h-screen bg-gray-50 flex'; New = 'className="min-h-screen bg-gray-50 dark:bg-gray-900 flex' },
    @{ Old = 'className="min-h-screen bg-gray-50">'; New = 'className="min-h-screen bg-gray-50 dark:bg-gray-900">' },
    
    # White backgrounds
    @{ Old = 'className="bg-white shadow-sm border-b border-gray-200'; New = 'className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700' },
    @{ Old = 'className="bg-white rounded-lg shadow-md p-6 mb-6"'; New = 'className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6"' },
    @{ Old = 'className="bg-white rounded-lg shadow-md hover:shadow-xl'; New = 'className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl' },
    @{ Old = 'className="bg-white border-l border-gray-200'; New = 'className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700' },
    @{ Old = 'className="bg-white border-t border-gray-200'; New = 'className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700' },
    @{ Old = 'className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl'; New = 'className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl' },
    @{ Old = 'className="w-full h-full bg-white"'; New = 'className="w-full h-full bg-white dark:bg-gray-800"' },
    
    # White overlay backgrounds
    @{ Old = 'className="absolute inset-0 bg-white bg-opacity-90'; New = 'className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90' },
    
    # Input fields and selects
    @{ Old = 'className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"'; New = 'className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"' },
    @{ Old = 'className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w'; New = 'className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w' },
    @{ Old = 'className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"'; New = 'className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600"' },
    
    # Buttons
    @{ Old = 'className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled'; New = 'className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled' },
    @{ Old = 'className="w-full px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"'; New = 'className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"' },
    @{ Old = 'className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled'; New = 'className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled' },
    @{ Old = 'className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'; New = 'className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600' },
    @{ Old = 'className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'; New = 'className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed' },
    @{ Old = 'className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed'; New = 'className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed' },
    @{ Old = 'className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed'; New = 'className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed' },
    
    # Text colors
    @{ Old = 'className="text-sm font-medium text-gray-700">Select Path'; New = 'className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Path' },
    @{ Old = 'className="text-sm text-gray-600 bg-gray-50 px-3'; New = 'className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3' },
    @{ Old = 'className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"'; New = 'className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"' },
    @{ Old = 'className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded'; New = 'className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded' },
    
    # Dialogs
    @{ Old = 'className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"'; New = 'className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all"' },
    @{ Old = 'className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"'; New = 'className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all"' },
    
    # Side panels and cards
    @{ Old = 'className="w-80 bg-white border-l border-gray-200 shadow-lg overflow-y-auto"'; New = 'className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg overflow-y-auto"' }
)

# Files to update
$filesToUpdate = @(
    "learning-path\LearningPathViewer.tsx",
    "knowledge-graph\KnowledgeGraphViewer.tsx",
    "knowledge-graph\GraphToolbar.tsx",
    "knowledge-graph\NodeDetailPanel.tsx",
    "concepts\ConceptManagement.tsx"
)

$totalReplacements = 0
$filesModified = 0

foreach ($file in $filesToUpdate) {
    $filePath = Join-Path $learnerWebAppPath $file
    
    if (Test-Path $filePath) {
        Write-Host "" -ForegroundColor Yellow
        Write-Host "Processing: $file" -ForegroundColor Yellow
        $content = Get-Content -Path $filePath -Raw
        $originalContent = $content
        $fileReplacements = 0
        
        foreach ($replacement in $replacements) {
            if ($content -match [regex]::Escape($replacement.Old)) {
                $content = $content -replace [regex]::Escape($replacement.Old), $replacement.New
                $fileReplacements++
            }
        }
        
        if ($content -ne $originalContent) {
            Set-Content -Path $filePath -Value $content -NoNewline
            Write-Host "   Applied $fileReplacements replacements" -ForegroundColor Green
            $totalReplacements += $fileReplacements
            $filesModified++
        } else {
            Write-Host "   No changes needed" -ForegroundColor Gray
        }
    } else {
        Write-Host "   File not found: $filePath" -ForegroundColor Red
    }
}

Write-Host "" -ForegroundColor Cyan
Write-Host "Dark Mode Update Complete!" -ForegroundColor Cyan
Write-Host "   Files Modified: $filesModified" -ForegroundColor Green
Write-Host "   Total Replacements: $totalReplacements" -ForegroundColor Green
Write-Host "" -ForegroundColor Yellow
Write-Host "Next: Run npm run build to rebuild" -ForegroundColor Yellow
