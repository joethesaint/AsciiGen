
function testThumbCentering() {
    const slider = document.querySelector('.asterisk-slider');
    if (!slider) return "FAIL: No slider found";
    
    const style = window.getComputedStyle(slider, '::-webkit-slider-thumb');
    const marginTop = style.getPropertyValue('margin-top');
    const height = style.getPropertyValue('height');
    
    // We want to check if marginTop is roughly -(height/2 - trackHeight/2)
    // trackHeight is 2px from CSS
    const h = parseInt(height);
    const mt = parseInt(marginTop);
    
    if (isNaN(mt)) return "FAIL: margin-top is not a number: " + marginTop;
    
    const expectedMt = -(Math.floor(h/2) - 1); // 24/2 - 1 = 11, so -11
    
    if (mt === expectedMt) {
        return "PASS: Thumb is aligned (mt=" + mt + ")";
    } else {
        return "FAIL: Thumb is misaligned (mt=" + mt + ", expected=" + expectedMt + ")";
    }
}
console.log(testThumbCentering());
