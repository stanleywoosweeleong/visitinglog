import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
export default defineConfig({base:'./',build:{target:'esnext'},plugins:[VitePWA({registerType:'prompt',includeAssets:['icon.svg'],manifest:{name:'Ladang Farm Notebook',short_name:'Ladang',description:'Your shared farm visit notebook',theme_color:'#143d32',background_color:'#f3f6f4',display:'standalone',start_url:'.',icons:[{src:'icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]},workbox:{globPatterns:['**/*.{js,css,html,svg}'],maximumFileSizeToCacheInBytes:6000000,navigateFallback:'index.html'}})]});
