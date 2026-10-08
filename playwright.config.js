import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',timeout:60000,use:{baseURL:'http://127.0.0.1:4173',timezoneId:'Asia/Kuala_Lumpur'},webServer:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:true}});
