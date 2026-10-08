// Vite: import souboru jako URL (`soubor.ogg?url`), zabalí ho do buildu.
declare module '*?url' {
    const url: string;
    export default url;
}
