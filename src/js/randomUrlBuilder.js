const form = document.getElementById('urlBuilderForm');
const nameInput = document.getElementById('builderName');
const seedInput = document.getElementById('builderSeed');
const countInput = document.getElementById('builderCount');
const daysBeforeInput = document.getElementById('builderDaysBefore');
const daysAfterInput = document.getElementById('builderDaysAfter');
const mergeInput = document.getElementById('builderMerge');
const downloadInput = document.getElementById('builderDownload');
const autoDownloadInput = document.getElementById('builderAutoDownload');
const previewInput = document.getElementById('builderPreview');
const typeInputs = Array.from(document.querySelectorAll('.builderType'));

const viewerOutput = document.getElementById('viewerUrlOutput');
const downloadOutput = document.getElementById('downloadUrlOutput');
const autoDownloadOutput = document.getElementById('autoDownloadUrlOutput');
const previewOutput = document.getElementById('previewUrlOutput');

const openViewerBtn = document.getElementById('openViewerBtn');
const copyViewerBtn = document.getElementById('copyViewerBtn');
const copyDownloadBtn = document.getElementById('copyDownloadBtn');
const copyAutoDownloadBtn = document.getElementById('copyAutoDownloadBtn');
const copyPreviewBtn = document.getElementById('copyPreviewBtn');
const generateSeedBtn = document.getElementById('generateSeedBtn');

function clampInt(value, min, max, fallback) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        return fallback;
    }
    return Math.max(min, Math.min(max, parsed));
}

function getSelectedTypes() {
    const selected = typeInputs.filter((input) => input.checked).map((input) => input.value);
    return selected.length > 0 ? selected : ['meeting'];
}

function buildBaseParams() {
    const params = new URLSearchParams();
    params.set('random', 'true');
    params.set('count', String(clampInt(countInput.value, 1, 200, 20)));
    params.set('daysBefore', String(clampInt(daysBeforeInput.value, 0, 365, 30)));
    params.set('daysAfter', String(clampInt(daysAfterInput.value, 0, 365, 60)));
    params.set('types', getSelectedTypes().join(','));

    const name = nameInput.value.trim();
    if (name) {
        params.set('name', name);
    }

    const seed = seedInput.value.trim();
    if (seed) {
        const normalizedSeed = clampInt(seed, 0, 2147483647, 0);
        params.set('seed', String(normalizedSeed));
    }

    if (mergeInput.checked) {
        params.set('merge', 'true');
    }

    return params;
}

function buildUrl(params) {
    const url = new URL('index.html', window.location.href);
    url.search = params.toString();
    return url.toString();
}

function updateOutputs() {
    const baseParams = buildBaseParams();

    const viewerUrl = buildUrl(baseParams);
    viewerOutput.value = viewerUrl;

    const downloadParams = new URLSearchParams(baseParams.toString());
    downloadParams.set('download', 'true');
    downloadOutput.value = buildUrl(downloadParams);

    const autoDownloadParams = new URLSearchParams(baseParams.toString());
    autoDownloadParams.set('autodownload', 'true');
    autoDownloadOutput.value = buildUrl(autoDownloadParams);

    const previewParams = new URLSearchParams(baseParams.toString());
    previewParams.set('preview', 'ics');
    previewOutput.value = buildUrl(previewParams);

    if (downloadInput.checked) {
        const activeParams = new URLSearchParams(baseParams.toString());
        activeParams.set('download', 'true');
        viewerOutput.value = buildUrl(activeParams);
    }

    if (previewInput.checked) {
        const activeParams = new URLSearchParams(baseParams.toString());
        activeParams.set('preview', 'ics');
        viewerOutput.value = buildUrl(activeParams);
    }

    if (autoDownloadInput.checked) {
        const activeParams = new URLSearchParams(baseParams.toString());
        activeParams.set('autodownload', 'true');
        viewerOutput.value = buildUrl(activeParams);
    }
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        return false;
    }
}

function wireCopy(button, output) {
    button.addEventListener('click', async () => {
        const ok = await copyText(output.value);
        if (!ok) {
            output.focus();
            output.select();
            document.execCommand('copy');
        }
    });
}

form.addEventListener('input', updateOutputs);
form.addEventListener('change', updateOutputs);

openViewerBtn.addEventListener('click', () => {
    window.open(viewerOutput.value, '_blank', 'noopener');
});

generateSeedBtn.addEventListener('click', () => {
    seedInput.value = String(Math.floor(Math.random() * 2147483647));
    updateOutputs();
});

wireCopy(copyViewerBtn, viewerOutput);
wireCopy(copyDownloadBtn, downloadOutput);
wireCopy(copyAutoDownloadBtn, autoDownloadOutput);
wireCopy(copyPreviewBtn, previewOutput);

updateOutputs();
