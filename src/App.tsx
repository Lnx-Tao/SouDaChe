import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Target, Coins, Heart, RefreshCw, Map, X } from 'lucide-react';
import { GameState, MAP_WIDTH, MAP_HEIGHT } from './types';
import { createInitialState } from './modules/scene';
import { updatePlayer } from './modules/player';
import { updateEnemies } from './modules/enemies';
import { drawMinimap, drawLargeMap } from './modules/maps';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const largeMapRef = useRef<HTMLCanvasElement>(null);
  const showMapModalRef = useRef<boolean>(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const gameState = useRef<GameState>(createInitialState());
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [hud, setHud] = useState({ hp: 100, coins: 0, status: 'playing' });

  const syncHUD = useCallback(() => {
    const state = gameState.current;
    setHud({
      hp: Math.max(0, Math.ceil(state.player.hp)),
      coins: state.coinsCollected,
      status: state.status,
    });
  }, []);

  const restartGame = () => {
    gameState.current = createInitialState();
    syncHUD();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (gameState.current.keys.hasOwnProperty(key)) {
        gameState.current.keys[key] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (gameState.current.keys.hasOwnProperty(key)) {
        gameState.current.keys[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let lastSyncedHp = 100;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1); // max 100ms step
      lastTimeRef.current = time;

      const state = gameState.current;

      if (state.status === 'playing') {
        // Update logic
        if (!showMapModalRef.current) {
          updatePlayer(state, dt, canvas.width, canvas.height);
        }

        // Update camera
        state.camera.x = state.player.x - canvas.width / 2;
        state.camera.y = state.player.y - canvas.height / 2;
        state.camera.x = Math.max(0, Math.min(MAP_WIDTH - canvas.width, state.camera.x));
        state.camera.y = Math.max(0, Math.min(MAP_HEIGHT - canvas.height, state.camera.y));

        updateEnemies(state, dt, syncHUD);

        // Bullets
        for (let i = state.bullets.length - 1; i >= 0; i--) {
          const b = state.bullets[i];
          b.x += b.vx * dt;
          b.y += b.vy * dt;

          let hitObs = false;
          for (const obs of state.obstacles) {
            if (b.x > obs.x && b.x < obs.x + obs.width && b.y > obs.y && b.y < obs.y + obs.height) {
              hitObs = true;
              break;
            }
          }
          if (hitObs) {
            state.bullets.splice(i, 1);
            continue;
          }

          let hit = false;
          for (let j = state.enemies.length - 1; j >= 0; j--) {
            const e = state.enemies[j];
            if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
              e.hp -= b.damage;
              hit = true;
              if (e.hp <= 0) {
                state.enemies.splice(j, 1);
                // 40% chance to drop coin
                if (Math.random() > 0.6) {
                  state.coins.push({
                    id: Math.random(),
                    x: e.x,
                    y: e.y,
                    radius: 8,
                    value: 10,
                  });
                }
              }
              break;
            }
          }
          // Remove bullet if it hits or goes out of bounds
          if (hit || b.x < 0 || b.x > MAP_WIDTH || b.y < 0 || b.y > MAP_HEIGHT) {
            state.bullets.splice(i, 1);
          }
        }

        // Coins
        for (let i = state.coins.length - 1; i >= 0; i--) {
          const c = state.coins[i];
          if (Math.hypot(state.player.x - c.x, state.player.y - c.y) < state.player.radius + c.radius + 15) {
            state.coinsCollected += c.value;
            state.coins.splice(i, 1);
            syncHUD();
          }
        }

        // Extraction
        const ext = state.extraction;
        if (
          state.player.x > ext.x &&
          state.player.x < ext.x + ext.width &&
          state.player.y > ext.y &&
          state.player.y < ext.y + ext.height
        ) {
          state.extractionTimer += dt;
          if (state.extractionTimer >= 5) {
            state.status = 'won';
            syncHUD();
          }
        } else {
          state.extractionTimer = 0;
        }

        // Sync HP if changed significantly
        if (Math.abs(state.player.hp - lastSyncedHp) >= 1) {
          syncHUD();
          lastSyncedHp = state.player.hp;
        }
      }

      // Draw
      ctx.fillStyle = '#18181b'; // zinc-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-state.camera.x, -state.camera.y);

      // Grid
      ctx.strokeStyle = '#27272a'; // zinc-800
      ctx.lineWidth = 2;
      for (let x = 0; x <= MAP_WIDTH; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_HEIGHT); ctx.stroke();
      }
      for (let y = 0; y <= MAP_HEIGHT; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_WIDTH, y); ctx.stroke();
      }

      // Obstacles
      ctx.fillStyle = '#3f3f46'; // zinc-700
      ctx.strokeStyle = '#52525b'; // zinc-600
      ctx.lineWidth = 4;
      state.obstacles.forEach(obs => {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      });

      // Extraction Zone
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'; // emerald-500 with opacity
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.fillRect(state.extraction.x, state.extraction.y, state.extraction.width, state.extraction.height);
      ctx.strokeRect(state.extraction.x, state.extraction.y, state.extraction.width, state.extraction.height);
      
      // Extraction Zone Text
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('撤离点', state.extraction.x + state.extraction.width / 2, state.extraction.y + state.extraction.height / 2);

      // Coins
      state.coins.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b'; // amber-500
        ctx.fill();
        ctx.strokeStyle = '#d97706'; // amber-600
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Enemies
      state.enemies.forEach((e) => {
        ctx.beginPath();
        if (e.type === 'circle') {
          ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        } else if (e.type === 'square') {
          ctx.rect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
        } else if (e.type === 'triangle') {
          ctx.moveTo(e.x, e.y - e.radius);
          ctx.lineTo(e.x - e.radius, e.y + e.radius);
          ctx.lineTo(e.x + e.radius, e.y + e.radius);
          ctx.closePath();
        }
        ctx.fillStyle = '#ef4444'; // red-500
        ctx.fill();
        
        // Enemy Health Bar
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x - 15, e.y - 25, 30, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(e.x - 15, e.y - 25, 30 * (e.hp / e.maxHp), 4);
      });

      // Bullets
      state.bullets.forEach((b) => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fcd34d'; // amber-300
        ctx.fill();
        // Bullet glow
        ctx.shadowColor = '#fcd34d';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Player
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6'; // blue-500
      ctx.fill();
      ctx.strokeStyle = '#2563eb'; // blue-600
      ctx.lineWidth = 3;
      ctx.stroke();

      // Player direction indicator (optional, maybe towards nearest enemy?)
      let nearestEnemy = null;
      let minDst = Infinity;
      for (const e of state.enemies) {
        const dst = Math.hypot(e.x - state.player.x, e.y - state.player.y);
        if (dst < minDst) {
          minDst = dst;
          nearestEnemy = e;
        }
      }
      if (nearestEnemy && state.status === 'playing') {
        const dx = nearestEnemy.x - state.player.x;
        const dy = nearestEnemy.y - state.player.y;
        const dist = Math.hypot(dx, dy);
        ctx.beginPath();
        ctx.moveTo(state.player.x, state.player.y);
        ctx.lineTo(state.player.x + (dx / dist) * 30, state.player.y + (dy / dist) * 30);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Evac Countdown
      if (state.status === 'playing' && state.extractionTimer > 0) {
        const timeLeft = Math.max(0, 5 - state.extractionTimer).toFixed(1);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`正在撤离: ${timeLeft}s`, canvas.width / 2, canvas.height / 4);
        
        const barWidth = 400;
        const barHeight = 20;
        const barX = canvas.width / 2 - barWidth / 2;
        const barY = canvas.height / 4 + 40;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = '#10b981';
        ctx.fillRect(barX, barY, barWidth * (state.extractionTimer / 5), barHeight);
        
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
      }

      // Evac Arrow Indicator
      if (state.status === 'playing') {
        const extCenterX = state.extraction.x + state.extraction.width / 2;
        const extCenterY = state.extraction.y + state.extraction.height / 2;
        const dx = extCenterX - state.player.x;
        const dy = extCenterY - state.player.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 300) {
          const angle = Math.atan2(dy, dx);
          const playerScreenX = state.player.x - state.camera.x;
          const playerScreenY = state.player.y - state.camera.y;
          
          const arrowDist = 120;
          const arrowX = playerScreenX + Math.cos(angle) * arrowDist;
          const arrowY = playerScreenY + Math.sin(angle) * arrowDist;
          
          ctx.save();
          ctx.translate(arrowX, arrowY);
          ctx.rotate(angle);
          
          ctx.beginPath();
          ctx.moveTo(16, 0);
          ctx.lineTo(-12, -12);
          ctx.lineTo(-4, 0);
          ctx.lineTo(-12, 12);
          ctx.closePath();
          
          ctx.fillStyle = '#10b981';
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 15;
          ctx.fill();
          
          ctx.restore();
        }
      }

      // Draw Minimap
      if (minimapRef.current) {
        drawMinimap(minimapRef.current, state, canvas.width, canvas.height);
      }

      // Draw Large Map
      if (showMapModalRef.current && largeMapRef.current) {
        drawLargeMap(largeMapRef.current, state);
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [syncHUD]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-900 font-sans select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
        <div className="flex gap-4">
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl p-4 flex items-center gap-3 shadow-xl">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            <div className="w-32 h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-200" 
                style={{ width: `${hud.hp}%` }}
              />
            </div>
            <span className="text-white font-mono font-bold w-8">{hud.hp}</span>
          </div>

          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl p-4 flex items-center gap-3 shadow-xl">
            <Coins className="w-6 h-6 text-amber-500" />
            <span className="text-amber-500 font-mono font-bold text-xl">{hud.coins}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 items-end pointer-events-auto">
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col items-end pointer-events-none">
            <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-1">当前任务</p>
            <p className="text-emerald-400 font-bold text-lg">前往撤离点</p>
          </div>
          
          <div 
            className="relative bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl p-2 shadow-xl cursor-pointer hover:border-zinc-600 transition-colors"
            onClick={() => {
              setShowMapModal(true);
              showMapModalRef.current = true;
            }}
          >
            <canvas ref={minimapRef} width={200} height={200} className="rounded-lg bg-zinc-950" />
            <div className="absolute bottom-4 right-4 bg-black/60 p-1.5 rounded-md">
              <Map className="w-5 h-5 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Fire Button */}
      {hud.status === 'playing' && (
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            gameState.current.isFiring = true;
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            gameState.current.isFiring = false;
          }}
          onPointerLeave={() => {
            gameState.current.isFiring = false;
          }}
          onPointerCancel={() => {
            gameState.current.isFiring = false;
          }}
          className="absolute bottom-12 right-12 w-32 h-32 bg-red-500 hover:bg-red-400 active:bg-red-600 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.4)] border-4 border-red-400/50 transition-colors touch-none"
        >
          <Target className="w-10 h-10 text-white mb-1" />
          <span className="text-white font-bold tracking-wider text-lg">开火</span>
        </button>
      )}

      {/* WASD Hint */}
      {hud.status === 'playing' && (
         <div className="absolute bottom-12 left-12 pointer-events-none opacity-40">
           <div className="flex flex-col items-center gap-2">
             <div className="w-14 h-14 border-2 border-white/50 rounded-xl flex items-center justify-center text-white font-bold text-2xl bg-white/5 backdrop-blur-sm">W</div>
             <div className="flex gap-2">
               <div className="w-14 h-14 border-2 border-white/50 rounded-xl flex items-center justify-center text-white font-bold text-2xl bg-white/5 backdrop-blur-sm">A</div>
               <div className="w-14 h-14 border-2 border-white/50 rounded-xl flex items-center justify-center text-white font-bold text-2xl bg-white/5 backdrop-blur-sm">S</div>
               <div className="w-14 h-14 border-2 border-white/50 rounded-xl flex items-center justify-center text-white font-bold text-2xl bg-white/5 backdrop-blur-sm">D</div>
             </div>
           </div>
         </div>
      )}

      {/* Large Map Modal */}
      {showMapModal && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-8">
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-4xl w-full max-h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Map className="w-6 h-6 text-zinc-400" />
                战术地图
              </h2>
              <button 
                onClick={() => {
                  setShowMapModal(false);
                  showMapModalRef.current = false;
                }}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-white"
              >
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>
            
            <div className="flex-1 bg-black rounded-xl overflow-hidden border border-zinc-800 relative flex items-center justify-center">
              <canvas 
                ref={largeMapRef} 
                width={800} 
                height={800} 
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
            
            <div className="mt-4 flex gap-6 justify-center text-sm text-zinc-400">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> 玩家</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> 敌人</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-zinc-600"></div> 障碍物</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-500/50"></div> 撤离点</div>
            </div>
          </div>
        </div>
      )}

      {/* Game Over / Win Screens */}
      {hud.status !== 'playing' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-3xl flex flex-col items-center max-w-md w-full text-center shadow-2xl">
            {hud.status === 'won' ? (
              <>
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                  <Target className="w-12 h-12 text-emerald-500" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">撤离成功</h2>
                <p className="text-zinc-400 mb-8 text-lg">你成功带出了 <span className="text-amber-500 font-bold">{hud.coins}</span> 枚金币！</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                  <Heart className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">阵亡</h2>
                <p className="text-zinc-400 mb-8 text-lg">你被敌人淹没了。</p>
              </>
            )}
            
            <button
              onClick={restartGame}
              className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              重新部署
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
