async function loadLicense() {

    var f = await fetch('../support/LICENSE.txt').then(response => {
        if (!response.ok) {
        throw new Error(`HTTP error, status = ${response.status}`);
        }
        return response.text();
    })
    .then(text => {
        return text;
    }).catch(e => {return null})
    return f
}
export var lic = null;
console.log(window.location.pathname);
lic = await loadLicense();
console.log(lic)