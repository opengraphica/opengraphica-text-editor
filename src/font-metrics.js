class FontMetrics {
    constructor(family, size) {
        this.family = family || (family = "Arial");
        this.size = parseInt(size) || (size = 12);

        // Preparing container
        const line = document.createElement('div');
        const body = document.body;
        line.style.position = 'absolute';
        line.style.whiteSpace = 'nowrap';
        line.style.font = size + 'px ' + family;
        body.appendChild(line);

        // Now we can measure width and height of the letter
        const text = 'wwwwwwwwww'; // 10 symbols to be more accurate with width
        line.innerHTML = text;
        this.width = line.offsetWidth / text.length;
        this.height = line.offsetHeight;

        // Now creating 1px sized item that will be aligned to baseline
        // to calculate baseline shift
        const baseline = document.createElement('span');
        baseline.style.display = 'inline-block';
        baseline.style.overflow = 'hidden';
        baseline.style.width = '1px';
        baseline.style.height = '1px';
        line.appendChild(baseline);

        // Baseline is important for positioning text on canvas
        this.baseline = baseline.offsetTop + baseline.offsetHeight;

        document.body.removeChild(line);
    }
}

export default FontMetrics;