
VM456:7 ✅ Service Worker registered successfully!
VM456:8    Scope: https://pos-pearl-psi.vercel.app/
sw.js:30 [SW] Installing...
VM456:9    Active: ⏳ Installing...
sw.js:34 [SW] Caching assets for all pages
VM456:26 ✅ Service Worker is active!
VM456:27    📱 PWA install should now work.
VM456:28    Look for install icon in address bar 🔽
sw.js:1 Uncaught (in promise) TypeError: Failed to execute 'addAll' on 'Cache': Request failed
// Detailed status check
navigator.serviceWorker.getRegistration()
    .then(function(reg) {
        if (reg) {
            console.log('📊 Service Worker Status:');
            console.log('   Active:', reg.active ? '✅ Yes' : '❌ No');
            console.log('   State:', reg.active ? reg.active.state : 'None');
            console.log('   Scope:', reg.scope);
            
            if (reg.active && reg.active.state === 'activated') {
                console.log('✅ Ready to install PWA!');
                console.log('🔽 Look for install icon in address bar');
            } else {
                console.log('⏳ Waiting for activation...');
            }
        } else {
            console.log('❌ No Service Worker');
            console.log('💡 Try refreshing the page');
        }
    });
Promise {<pending>}
VM460:17 ❌ No Service Worker
VM460:18 💡 Try refreshing the page
