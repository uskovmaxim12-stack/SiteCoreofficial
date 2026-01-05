// Конфигурация базы данных
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GIST_URL: 'https://gist.githubusercontent.com/uskovmaxim12-stack/30dbe17ad2208d9eb8809574ee8ef012/raw/sitecore_db.json',
    
    // Используем localStorage как кэш, а Gist как основное хранилище
    saveLocal: (data) => {
        localStorage.setItem('sitecore_db', JSON.stringify(data));
        localStorage.setItem('sitecore_last_sync', Date.now().toString());
    },
    
    loadLocal: () => {
        const localData = localStorage.getItem('sitecore_db');
        return localData ? JSON.parse(localData) : null;
    },
    
    // Проверяем, нужно ли синхронизировать (раз в 30 секунд)
    needSync: () => {
        const lastSync = localStorage.getItem('sitecore_last_sync');
        if (!lastSync) return true;
        return Date.now() - parseInt(lastSync) > 30000;
    }
};
