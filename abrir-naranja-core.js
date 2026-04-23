// @name         Abrir todos Registrado - Monitor Visual (Independiente) - FINAL-v2
// @namespace    https://example.local/
// @version      2.5
// @description  Escanea automáticamente cada 25 segundos con interfaz visual de monitoreo (inicia minimizado como flecha)
// @match        https://aranda.positiva.gov.co/ASDKV8/Main/Pages/Cases.aspx*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function(){
  'use strict';
  console.log('[abrir-todos] auto-scan con UI arrancando');

  const injectedCode = function(){
    (function(){
      try {
        console.log('[abrir-todos][injected] iniciado con monitor visual');

        const CONFIG = {
          mode: 'invoke',
          maxToOpen: 20,
          delayMs: 600,
          waitTimeoutMs: 5000,
          pollIntervalMs: 300,
          autoScanIntervalMs: 25000
        };

        let isProcessing = false;
        let scanCount = 0;
        let totalProcessed = 0;
        let totalFailed = 0;
        let isRegistradosMinimized = true; // Inicia minimizado (solo la flecha)

        function log(...a){ console.log('[abrir-todos][injected]', ...a); }
        function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

        function dispatchMouseSequence(el){
          try {
            ['pointerdown','mousedown','mouseup','click'].forEach(type=>{
              el.dispatchEvent(new MouseEvent(type, {bubbles:true,cancelable:true,view:window}));
            });
            return true;
          } catch(e){ return false; }
        }

        // ==========================================
        // UI MODIFICADA (Solo Diseño)
        // ==========================================
        function createMonitorUI(){
          const panel = document.createElement('div');
          panel.id = 'abrir-todos-monitor-panel'; // ID único
          panel.innerHTML = `
            <!-- FLECHA MINIMIZADA PEGADA A LA DERECHA -->
            <div id="registrados-monitor-arrow" style="position: fixed; bottom: 20px; right: 0; z-index: 999999;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white; padding: 12px 8px 12px 14px; border-radius: 8px 0 0 8px;
                        box-shadow: -2px 4px 10px rgba(0,0,0,0.3); cursor: pointer;
                        display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
              <span style="font-size: 16px; font-weight: bold; line-height: 1;">◀</span>
            </div>

            <!-- PANEL COMPLETO -->
            <div id="registrados-monitor-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 999999;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white; padding: 15px 20px; border-radius: 12px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.3); font-family: 'Segoe UI', Arial, sans-serif;
                        min-width: 220px; backdrop-filter: blur(10px); display: none;">

              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">📋 Monitor Registrados</h3>
                <button id="registrados-monitor-toggle" style="background: rgba(255,255,255,0.2); border: none;
                        color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer;
                        font-size: 12px; font-weight: 500;">▶ Ocultar</button>
              </div>

              <div style="background: rgba(255,255,255,0.15); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="font-size: 12px; opacity: 0.9;">Estado:</span>
                  <span id="registrados-monitor-status" style="font-size: 12px; font-weight: 600;">🟢 Activo</span>
                </div>
              </div>

              <div id="registrados-monitor-content">
                <div style="background: rgba(255,255,255,0.15); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-size: 12px; opacity: 0.9;">Escaneos:</span>
                    <span id="registrados-monitor-scans" style="font-size: 12px; font-weight: 600;">0</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-size: 12px; opacity: 0.9;">Próximo en:</span>
                    <span id="registrados-monitor-countdown" style="font-size: 12px; font-weight: 600;">--</span>
                  </div>
                </div>

                <div style="background: rgba(255,255,255,0.15); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-size: 12px; opacity: 0.9;">✅ Procesados:</span>
                    <span id="registrados-monitor-success" style="font-size: 12px; font-weight: 600; color: #4ade80;">0</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-size: 12px; opacity: 0.9;">❌ Fallidos:</span>
                    <span id="registrados-monitor-failed" style="font-size: 12px; font-weight: 600; color: #f87171;">0</span>
                  </div>
                </div>

                <div id="registrados-monitor-log" style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px;
                                             font-size: 11px; max-height: 50px; overflow-y: auto;
                                             font-family: 'Courier New', monospace; line-height: 1.4;">
                  <div style="opacity: 0.7;">Esperando primer escaneo...</div>
                </div>

                <div style="margin-top: 10px; display: flex; gap: 8px;">
                  <button id="registrados-monitor-pause" style="flex: 1; background: rgba(255,255,255,0.2); border: none;
                          color: white; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px;
                          font-weight: 600; transition: all 0.2s;">⏸ Pausar</button>
                  <button id="registrados-monitor-scan-now" style="flex: 1; background: rgba(255,255,255,0.3); border: none;
                          color: white; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px;
                          font-weight: 600; transition: all 0.2s;">▶ Escanear Ahora</button>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(panel);

          const arrowBtn = document.getElementById('registrados-monitor-arrow');
          const toggleBtn = document.getElementById('registrados-monitor-toggle');
          const container = document.getElementById('registrados-monitor-container');

          function updateToggleState() {
            if (isRegistradosMinimized) {
              container.style.display = 'none';
              arrowBtn.style.display = 'flex';
            } else {
              container.style.display = 'block';
              arrowBtn.style.display = 'none';
            }
          }

          updateToggleState();

          // Evento para abrir el panel (clic en flecha)
          arrowBtn.addEventListener('click', () => {
            isRegistradosMinimized = false;
            updateToggleState();
          });

          // Evento para ocultar el panel (clic en ocultar)
          toggleBtn.addEventListener('click', () => {
            isRegistradosMinimized = true;
            updateToggleState();
          });

          let isPaused = false;
          const pauseBtn = document.getElementById('registrados-monitor-pause');
          pauseBtn.addEventListener('click', () => {
            isPaused = !isPaused;
            pauseBtn.textContent = isPaused ? '▶ Reanudar' : '⏸ Pausar';
            pauseBtn.style.background = isPaused ? 'rgba(255,200,0,0.4)' : 'rgba(255,255,255,0.2)';
            window.monitorPaused = isPaused;
            addLog(isPaused ? '⏸ Monitor pausado' : '▶ Monitor reanudado', 'warning');
          });

          document.getElementById('registrados-monitor-scan-now').addEventListener('click', () => {
            if (!isProcessing) {
              addLog('🔄 Escaneo manual iniciado...', 'info');
              processTargets();
            } else {
              addLog('⚠ Ya hay un escaneo en proceso', 'warning');
            }
          });

          return panel;
        }
        // ==========================================

        function updateStatus(text, type = 'normal'){
          const el = document.getElementById('registrados-monitor-status');
          if (el) {
            const icons = {
              active: '🟢',
              processing: '🔄',
              paused: '⏸',
              error: '🔴'
            };
            el.textContent = `${icons[type] || '🟢'} ${text}`;
          }
        }

        function updateScans(count){
          const el = document.getElementById('registrados-monitor-scans');
          if (el) el.textContent = count;
        }

        function updateStats(){
          const success = document.getElementById('registrados-monitor-success');
          const failed = document.getElementById('registrados-monitor-failed');
          if (success) success.textContent = totalProcessed;
          if (failed) failed.textContent = totalFailed;
        }

        function addLog(message, type = 'normal'){
          const logEl = document.getElementById('registrados-monitor-log');
          if (!logEl) return;

          const time = new Date().toLocaleTimeString();
          const colors = {
            success: '#4ade80',
            error: '#f87171',
            warning: '#fbbf24',
            info: '#60a5fa',
            normal: '#e5e7eb'
          };

          const entry = document.createElement('div');
          entry.style.color = colors[type] || colors.normal;
          entry.style.marginBottom = '2px';
          entry.textContent = `[${time}] ${message}`;

          logEl.appendChild(entry);
          logEl.scrollTop = logEl.scrollHeight;

          while (logEl.children.length > 50) {
            logEl.removeChild(logEl.firstChild);
          }
        }

        function startCountdown(){
          let remaining = CONFIG.autoScanIntervalMs / 1000;
          const countdownEl = document.getElementById('registrados-monitor-countdown');

          setInterval(() => {
            if (window.monitorPaused) {
              if (countdownEl) countdownEl.textContent = 'Pausado';
              return;
            }

            remaining--;
            if (remaining <= 0) remaining = CONFIG.autoScanIntervalMs / 1000;

            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            if (countdownEl) countdownEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
          }, 1000);
        }

        function findTargets(){
          const rows = Array.from(document.querySelectorAll('table.k-selectable tr, table tr, tr'));
          const targets = [];
          rows.forEach(row => {
            const text = (row.textContent||'').trim();
            if (!/Registrado/i.test(text)) return;
            const caseLink = row.querySelector('a.expiration__link') || row.querySelector('a[href*="Cases.aspx"], a[href*="Case"]');
            let id = null;
            if (caseLink) {
              const ng = caseLink.getAttribute && caseLink.getAttribute('ng-click');
              const m = ng && ng.match(/openCase\(\s*(\d+)\s*\)/);
              if (m) id = Number(m[1]);
              if (!id) {
                const mm = (caseLink.textContent||'').match(/\b(\d{4,})\b/);
                if (mm) id = Number(mm[1]);
              }
            }
            if (!id) {
              const btn = row.querySelector('button[id^="button-follow-list-"], button[data-case-id], [data-case-id]');
              if (btn) {
                const bid = btn.id ? btn.id.replace('button-follow-list-','') : (btn.getAttribute('data-case-id') || '');
                if (/^\d+$/.test(bid)) id = Number(bid);
              }
            }
            if (!id) {
              const mm = text.match(/\b(\d{4,})\b/);
              if (mm) id = Number(mm[1]);
            }
            targets.push({ row, caseLink: caseLink || null, id: id || null, rowText: text });
          });
          return targets.filter(t => t.id || t.caseLink);
        }

        async function waitForTargets(timeoutMs, intervalMs){
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            const targets = findTargets();
            if (targets.length) return targets;
            await sleep(intervalMs);
          }
          return [];
        }

        async function processTargets(){
          if (isProcessing) {
            addLog('Ya hay un proceso activo', 'warning');
            return;
          }
          if (window.monitorPaused) {
            addLog('Monitor pausado - Saltando escaneo', 'warning');
            return;
          }

          isProcessing = true;
          scanCount++;
          updateScans(scanCount);
          updateStatus('Escaneando...', 'processing');

          let localSuccess = 0;
          let localFailed = 0;

          try {
            addLog(`┏━━ Escaneo #${scanCount} iniciado ━━┓`, 'info');

            const targets = await waitForTargets(CONFIG.waitTimeoutMs, CONFIG.pollIntervalMs);

            if (!targets.length) {
              addLog('✔ No hay registros "Registrado"', 'success');
              updateStatus('Activo', 'active');
              return;
            }

            addLog(`Encontrados ${targets.length} casos "Registrado"`, 'info');
            const toProcess = Math.min(CONFIG.maxToOpen, targets.length);

            if (targets.length > CONFIG.maxToOpen) {
              addLog(`⚠ Limitando a ${CONFIG.maxToOpen} casos`, 'warning');
            }

            for (let i = 0; i < toProcess; i++){
              const t = targets[i];
              let handled = false;

              if (CONFIG.mode === 'invoke' && window.angular && window.angular.element) {
                try {
                  const elForScope = t.caseLink || t.row;
                  const aEl = window.angular.element(elForScope);

                  const sc = (aEl && aEl.scope && aEl.scope()) || null;
                  if (sc && typeof sc.openCase === 'function') {
                    sc.$apply ? sc.$apply(() => sc.openCase(t.id)) : sc.openCase(t.id);
                    handled = true;
                  } else {
                    const iso = (aEl && aEl.isolateScope && aEl.isolateScope()) || null;
                    if (iso && typeof iso.openCase === 'function') {
                      iso.$apply ? iso.$apply(() => iso.openCase(t.id)) : iso.openCase(t.id);
                      handled = true;
                    } else {
                      const ctrl = (aEl && aEl.controller && aEl.controller()) || null;
                      if (ctrl && typeof ctrl.openCase === 'function') {
                        ctrl.openCase(t.id);
                        handled = true;
                      }
                    }
                  }

                  if (!handled) {
                    const injector = window.angular.element(document.body).injector && window.angular.element(document.body).injector();
                    if (injector) {
                      const $rootScope = injector.get && injector.get('$rootScope');
                      if ($rootScope && typeof $rootScope.openCase === 'function') {
                        $rootScope.$apply ? $rootScope.$apply(()=> $rootScope.openCase(t.id)) : $rootScope.openCase(t.id);
                        handled = true;
                      }
                    }
                  }
                } catch(err){
                  log('Error invoke:', err);
                }
              }

              if (!handled && t.caseLink) {
                try {
                  if (window.jQuery && window.jQuery.fn && window.jQuery.fn.triggerHandler) {
                    window.jQuery(t.caseLink).triggerHandler('click');
                    handled = true;
                  }
                  if (!handled) {
                    dispatchMouseSequence(t.caseLink);
                    handled = true;
                  }
                } catch(e){}
              }

              if (!handled) {
                const anyA = t.row.querySelector('a');
                if (anyA) {
                  dispatchMouseSequence(anyA);
                  handled = true;
                }
              }

              if (handled) {
                localSuccess++;
                totalProcessed++;
                addLog(`✔ Caso ${t.id || 'N/A'} procesado (${i+1}/${toProcess})`, 'success');
              } else {
                localFailed++;
                totalFailed++;
                addLog(`✗ Caso ${t.id || 'N/A'} falló`, 'error');
              }

              updateStats();
              await sleep(CONFIG.delayMs);
            }

            if (localFailed > 0) {
              addLog(`⚠ ATENCIÓN: ${localFailed} casos no se abrieron`, 'warning');
            } else {
              addLog(`✔ Todos los casos procesados exitosamente`, 'success');
            }

            addLog(`┗━━ Escaneo #${scanCount} completado ━━┛`, 'info');
            updateStatus('Activo', 'active');

          } catch(e){
            addLog(`ERROR: ${e.message}`, 'error');
            updateStatus('Error', 'error');
            console.error('[abrir-todos] Error:', e);
          } finally {
            isProcessing = false;
          }
        }

        (async function init(){
          createMonitorUI();
          addLog('Monitor iniciado', 'success');
          startCountdown();

          await sleep(1000);
          await processTargets();

          setInterval(() => {
            if (!window.monitorPaused) {
              processTargets();
            }
          }, CONFIG.autoScanIntervalMs);

          log('Sistema de monitoreo activo');
        })();

      } catch(e){
        console.error('[abrir-todos][injected] error:', e);
      }
    })();
  };

  try {
    const s = document.createElement('script');
    s.setAttribute('type','text/javascript');
    s.textContent = '(' + injectedCode.toString() + ')();';
    (document.head || document.documentElement).appendChild(s);
    s.parentNode && s.parentNode.removeChild(s);
    console.log('[abrir-todos] Script con monitor visual inyectado');
  } catch(e){
    console.error('[abrir-todos] Error al inyectar:', e);
  }
})();
