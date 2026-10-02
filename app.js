import { previewInterface, showCompatibility } from './ui.js?v=0.6.0';
// Explicit development-only UI inspection. It never starts a match.
const preview = new URLSearchParams(location.search).get('preview');
if (preview) previewInterface(preview);
else import('./game.js?v=0.6.0').catch(error=>{
  console.error(error);
  showCompatibility('This browser could not start the 3D game. Use a desktop browser with WebGL and graphics acceleration. The armory and settings are still available.');
});
