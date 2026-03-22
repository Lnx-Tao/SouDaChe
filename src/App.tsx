import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Target, Coins, Heart, RefreshCw, Map, X, Crosshair, Unlock, Zap, Backpack, Diamond, ShoppingCart, Shield } from 'lucide-react';
import { GameState, MAP_WIDTH, MAP_HEIGHT, WeaponType, Inventory, QuestType, Quest } from './types';
import { createInitialState } from './modules/scene';
import { updatePlayer } from './modules/player';
import { updateEnemies } from './modules/enemies';
import { drawMinimap, drawLargeMap } from './modules/maps';
import { generateRandomTreasure } from './modules/treasure';
import { addTreasure, removeTreasure } from './modules/inventory';
import { updateQuestProgress } from './modules/quest';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const largeMapRef = useRef<HTMLCanvasElement>(null);
  const showMapModalRef = useRef<boolean>(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const showInventoryModalRef = useRef<boolean>(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const gameState = useRef<GameState>(createInitialState());
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [globalCoins, setGlobalCoins] = useState(() => {
    const saved = localStorage.getItem('neon_survivor_coins');
    return saved ? parseInt(saved, 10) : 1000;
  });

  useEffect(() => {
    localStorage.setItem('neon_survivor_coins', globalCoins.toString());
  }, [globalCoins]);

  const [nextGamePerks, setNextGamePerks] = useState({
    weaponType: 'pistol' as WeaponType,
    weaponLevel: 1,
    maxWeight: 20
  });

  const [hud, setHud] = useState({ 
    hp: 100, 
    coins: 0, 
    status: 'menu', 
    activeChestId: null as number | null, 
    activeWeaponDropId: null as number | null, 
    activeTreasureDropId: null as number | null,
    weapon: { type: 'pistol', level: 1 },
    inventory: { treasures: [], maxWeight: 20, currentWeight: 0 } as Inventory,
    quest: null as Quest | null
  });

  const syncHUD = useCallback(() => {
    const state = gameState.current;
    setHud({
      hp: Math.max(0, Math.ceil(state.player.hp)),
      coins: state.coinsCollected,
      status: state.status,
      activeChestId: state.activeChestId,
      activeWeaponDropId: state.activeWeaponDropId,
      activeTreasureDropId: state.activeTreasureDropId,
      weapon: state.player.weapon,
      inventory: { ...state.inventory },
      quest: state.quest ? { ...state.quest } : null
    });
  }, []);

  const startGame = () => {
    gameState.current = createInitialState();
    gameState.current.player.weapon = { type: nextGamePerks.weaponType, level: nextGamePerks.weaponLevel };
    gameState.current.inventory.maxWeight = nextGamePerks.maxWeight;
    // Reset perks for next game
    setNextGamePerks({ weaponType: 'pistol', weaponLevel: 1, maxWeight: 20 });
    gameState.current.status = 'playing';
    syncHUD();
  };

  const restartGame = () => {
    // Add collected coins to global coins
    // If won, coinsCollected already includes treasure value (converted during extraction)
    // If lost, coinsCollected only has the raw coins picked up
    const coinsToSave = gameState.current.coinsCollected;
    setGlobalCoins(prev => prev + coinsToSave);
    
    gameState.current = createInitialState();
    gameState.current.status = 'menu';
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
    let lastQuestCurrent = 0;
    let lastQuestLevel = 0;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1); // max 100ms step
      lastTimeRef.current = time;

      const state = gameState.current;

      // Update camera (always center on player for background view)
      state.camera.x = state.player.x - canvas.width / 2;
      state.camera.y = state.player.y - canvas.height / 2;
      state.camera.x = Math.max(0, Math.min(MAP_WIDTH - canvas.width, state.camera.x));
      state.camera.y = Math.max(0, Math.min(MAP_HEIGHT - canvas.height, state.camera.y));

      if (state.status === 'playing') {
        // Update logic
        if (!showMapModalRef.current && !showInventoryModalRef.current) {
          updatePlayer(state, dt, canvas.width, canvas.height);
        }

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
                updateQuestProgress(state, `kill_${e.type}` as QuestType);
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

        // Chests
        let nearestChest = null;
        let minChestDist = 100; // Interaction radius
        for (const chest of state.chests) {
          if (chest.opened) continue;
          const dist = Math.hypot(state.player.x - chest.x, state.player.y - chest.y);
          if (dist < minChestDist) {
            minChestDist = dist;
            nearestChest = chest;
          }
        }
        
        if (nearestChest) {
          if (state.activeChestId !== nearestChest.id) {
            state.activeChestId = nearestChest.id;
            syncHUD();
          }
        } else if (state.activeChestId !== null) {
          state.activeChestId = null;
          syncHUD();
        }

        // Dropped Weapons
        let nearestDrop = null;
        let minDropDist = 100;
        for (const drop of state.droppedWeapons) {
          const dist = Math.hypot(state.player.x - drop.x, state.player.y - drop.y);
          if (dist < minDropDist) {
            minDropDist = dist;
            nearestDrop = drop;
          }
        }

        if (nearestDrop && !nearestChest) {
          if (state.activeWeaponDropId !== nearestDrop.id) {
            state.activeWeaponDropId = nearestDrop.id;
            syncHUD();
          }
        } else if (state.activeWeaponDropId !== null) {
          state.activeWeaponDropId = null;
          syncHUD();
        }

        // Dropped Treasures
        let nearestTreasureDrop = null;
        let minTreasureDropDist = 100;
        for (const drop of state.droppedTreasures) {
          const dist = Math.hypot(state.player.x - drop.x, state.player.y - drop.y);
          if (dist < minTreasureDropDist) {
            minTreasureDropDist = dist;
            nearestTreasureDrop = drop;
          }
        }

        if (nearestTreasureDrop && !nearestChest && !nearestDrop) {
          if (state.activeTreasureDropId !== nearestTreasureDrop.id) {
            state.activeTreasureDropId = nearestTreasureDrop.id;
            syncHUD();
          }
        } else if (state.activeTreasureDropId !== null) {
          state.activeTreasureDropId = null;
          syncHUD();
        }

        // Lasers
        for (let i = state.lasers.length - 1; i >= 0; i--) {
          state.lasers[i].timer -= dt;
          if (state.lasers[i].timer <= 0) {
            state.lasers.splice(i, 1);
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
            // Convert treasures to coins
            let treasureValue = 0;
            state.inventory.treasures.forEach(t => treasureValue += t.value);
            state.coinsCollected += treasureValue;
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

        // Sync Quest if changed
        if (state.quest) {
          if (state.quest.current !== lastQuestCurrent || state.quest.level !== lastQuestLevel) {
            syncHUD();
            lastQuestCurrent = state.quest.current;
            lastQuestLevel = state.quest.level;
          }
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

      // Chests
      state.chests.forEach((chest) => {
        ctx.fillStyle = chest.opened ? '#52525b' : '#eab308'; // zinc-600 or yellow-500
        ctx.strokeStyle = chest.opened ? '#3f3f46' : '#ca8a04';
        ctx.lineWidth = 3;
        ctx.fillRect(chest.x - chest.radius, chest.y - chest.radius, chest.radius * 2, chest.radius * 2);
        ctx.strokeRect(chest.x - chest.radius, chest.y - chest.radius, chest.radius * 2, chest.radius * 2);
        
        // Chest lock/detail
        ctx.fillStyle = chest.opened ? '#27272a' : '#854d0e';
        ctx.fillRect(chest.x - 4, chest.y - 2, 8, 6);
        
        // Highlight active chest
        if (state.activeChestId === chest.id) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(chest.x - chest.radius - 5, chest.y - chest.radius - 5, chest.radius * 2 + 10, chest.radius * 2 + 10);
          ctx.setLineDash([]);
        }
      });

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

      // Dropped Weapons
      state.droppedWeapons.forEach((drop) => {
        ctx.beginPath();
        if (drop.type === 'pistol') {
          ctx.rect(drop.x - 12, drop.y - 12, 24, 24);
        } else if (drop.type === 'shotgun') {
          ctx.arc(drop.x, drop.y, 12, 0, Math.PI * 2);
        } else if (drop.type === 'laser') {
          ctx.moveTo(drop.x, drop.y - 14);
          ctx.lineTo(drop.x - 14, drop.y + 10);
          ctx.lineTo(drop.x + 14, drop.y + 10);
          ctx.closePath();
        }
        ctx.fillStyle = '#3b82f6'; // blue-500
        ctx.fill();
        ctx.strokeStyle = '#60a5fa'; // blue-400
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`LV.${drop.level}`, drop.x, drop.y - 25);
        
        if (state.activeWeaponDropId === drop.id) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(drop.x - 20, drop.y - 35, 40, 60);
          ctx.setLineDash([]);
        }
      });

      // Dropped Treasures
      state.droppedTreasures.forEach((drop) => {
        ctx.beginPath();
        ctx.rect(drop.x - 12, drop.y - 12, 24, 24);
        ctx.fillStyle = '#a855f7'; // purple-500
        ctx.fill();
        ctx.strokeStyle = '#c084fc'; // purple-400
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(drop.name, drop.x, drop.y - 25);
        
        if (state.activeTreasureDropId === drop.id) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(drop.x - 20, drop.y - 35, 40, 60);
          ctx.setLineDash([]);
        }
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

      // Lasers
      state.lasers.forEach((laser) => {
        ctx.beginPath();
        for (let i = 0; i < laser.segments.length; i++) {
          const seg = laser.segments[i];
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.strokeStyle = `rgba(56, 189, 248, ${laser.timer / 0.2})`; // sky-400
        ctx.lineWidth = laser.width;
        ctx.stroke();
        
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
        ctx.stroke();
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

      {/* Main Menu */}
      {hud.status === 'menu' && (
        <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center z-[100] p-8 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/30 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
            <div className="mb-12 text-center">
              <h1 className="text-7xl font-black text-white tracking-tighter mb-2 italic">
                NEON <span className="text-blue-500">SURVIVOR</span>
              </h1>
              <p className="text-zinc-500 font-medium tracking-widest uppercase text-sm">Tactical Extraction Shooter</p>
            </div>

            <div className="flex flex-col gap-4 w-full">
              <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-4 flex items-center justify-center gap-3 shadow-xl mb-4">
                <Coins className="w-8 h-8 text-amber-500" />
                <span className="text-amber-500 font-mono font-bold text-3xl">{globalCoins}</span>
              </div>

              <button
                onClick={() => {
                  startGame();
                  gameState.current.gameStartTime = Date.now();
                }}
                className="group relative w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-2xl transition-all active:scale-95 shadow-[0_0_40px_rgba(59,130,246,0.3)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <span className="relative flex items-center justify-center gap-3">
                  <Target className="w-8 h-8" />
                  开始游戏
                </span>
              </button>

              <button
                onClick={() => setShowShopModal(true)}
                className="w-full py-5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-2xl font-bold text-xl hover:bg-zinc-800 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <ShoppingCart className="w-6 h-6" />
                购买装备
              </button>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-zinc-600 text-xs uppercase font-bold tracking-widest mb-1">Version</p>
                <p className="text-zinc-400 font-mono text-sm">v1.0.5</p>
              </div>
              <div>
                <p className="text-zinc-600 text-xs uppercase font-bold tracking-widest mb-1">Status</p>
                <p className="text-emerald-500 font-mono text-sm">Online</p>
              </div>
              <div>
                <p className="text-zinc-600 text-xs uppercase font-bold tracking-widest mb-1">Region</p>
                <p className="text-zinc-400 font-mono text-sm">Global</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
        <div className="flex gap-4">
          <div className="flex flex-col gap-2">
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
            
            {hud.status === 'playing' && (
              <button
                onClick={() => {
                  setShowInventoryModal(true);
                  showInventoryModalRef.current = true;
                }}
                className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl p-3 flex items-center gap-3 shadow-xl hover:bg-zinc-800 transition-colors pointer-events-auto w-full"
              >
                <Backpack className="w-5 h-5 text-purple-400" />
                <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-200" 
                    style={{ width: `${(hud.inventory.currentWeight / hud.inventory.maxWeight) * 100}%` }}
                  />
                </div>
                <span className="text-white font-mono font-bold text-sm text-right min-w-[32px]">{hud.inventory.currentWeight}/{hud.inventory.maxWeight}</span>
              </button>
            )}
          </div>

          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl p-4 flex items-center gap-3 shadow-xl h-fit">
            <Coins className="w-6 h-6 text-amber-500" />
            <span className="text-amber-500 font-mono font-bold text-xl">{hud.coins}</span>
          </div>

          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl p-4 flex items-center gap-3 shadow-xl">
            {hud.weapon.type === 'pistol' && <Crosshair className="w-6 h-6 text-blue-400" />}
            {hud.weapon.type === 'shotgun' && <Target className="w-6 h-6 text-orange-400" />}
            {hud.weapon.type === 'laser' && <Zap className="w-6 h-6 text-sky-400" />}
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm leading-none">
                {hud.weapon.type === 'pistol' && '手枪'}
                {hud.weapon.type === 'shotgun' && '霰弹枪'}
                {hud.weapon.type === 'laser' && '激光枪'}
              </span>
              <span className="text-zinc-400 font-mono text-xs mt-1">LV.{hud.weapon.level}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 items-end pointer-events-auto">
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col items-end pointer-events-none">
            <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-1">主线任务</p>
            <p className="text-emerald-400 font-bold text-lg">前往撤离点</p>
            {hud.quest && (
              <>
                <div className="w-full h-px bg-zinc-800 my-3" />
                <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-1">支线任务 (Lv.{hud.quest.level})</p>
                <p className="text-purple-400 font-bold text-lg">
                  {hud.quest.type === 'kill_square' && `击杀方形敌人: ${hud.quest.current}/${hud.quest.target}`}
                  {hud.quest.type === 'kill_circle' && `击杀圆形敌人: ${hud.quest.current}/${hud.quest.target}`}
                  {hud.quest.type === 'kill_triangle' && `击杀三角形敌人: ${hud.quest.current}/${hud.quest.target}`}
                  {hud.quest.type === 'open_chest' && `开启宝箱: ${hud.quest.current}/${hud.quest.target}`}
                </p>
              </>
            )}
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

      {/* Chest Interaction */}
      {hud.status === 'playing' && hud.activeChestId !== null && (
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
          {(() => {
            const chest = gameState.current.chests.find(c => c.id === hud.activeChestId);
            if (!chest || chest.opened) return null;

            return (
              <button
                onClick={() => {
                  chest.opened = true;
                  updateQuestProgress(gameState.current, 'open_chest');
                  
                  // 50% chance to drop treasure instead of weapon
                  if (Math.random() > 0.5) {
                    const treasure = generateRandomTreasure();
                    gameState.current.droppedTreasures.push({
                      ...treasure,
                      x: chest.x,
                      y: chest.y + 30
                    });
                  } else {
                    const types: WeaponType[] = ['pistol', 'shotgun', 'laser'];
                    const randomType = types[Math.floor(Math.random() * types.length)];
                    const randomLevel = Math.floor(Math.random() * 5) + 1;
                    gameState.current.droppedWeapons.push({
                      id: Math.random(),
                      type: randomType,
                      level: randomLevel,
                      x: chest.x,
                      y: chest.y + 30
                    });
                  }
                  syncHUD();
                }}
                className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] active:scale-95 transition-all flex items-center gap-3 pointer-events-auto"
              >
                <Unlock className="w-6 h-6" />
                开启宝箱
              </button>
            );
          })()}
        </div>
      )}

      {/* Weapon Drop Interaction */}
      {hud.status === 'playing' && hud.activeWeaponDropId !== null && (
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
          {(() => {
            const drop = gameState.current.droppedWeapons.find(d => d.id === hud.activeWeaponDropId);
            if (!drop) return null;

            return (
              <div className="flex flex-col items-center gap-3 pointer-events-auto">
                <div className="bg-zinc-900/90 backdrop-blur border border-zinc-700 p-4 rounded-xl text-center shadow-xl">
                  <p className="text-zinc-400 text-sm mb-1">发现武器</p>
                  <p className="text-white font-bold text-lg flex items-center justify-center gap-2">
                    {drop.type === 'pistol' && <Crosshair className="w-5 h-5 text-blue-400" />}
                    {drop.type === 'shotgun' && <Target className="w-5 h-5 text-orange-400" />}
                    {drop.type === 'laser' && <Zap className="w-5 h-5 text-sky-400" />}
                    {drop.type === 'pistol' && '手枪'}
                    {drop.type === 'shotgun' && '霰弹枪'}
                    {drop.type === 'laser' && '激光枪'}
                    <span className="text-amber-400 ml-1">LV.{drop.level}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    const playerWeapon = gameState.current.player.weapon;
                    // Drop current weapon
                    gameState.current.droppedWeapons.push({
                      id: Math.random(),
                      type: playerWeapon.type,
                      level: playerWeapon.level,
                      x: drop.x,
                      y: drop.y
                    });
                    // Equip new weapon
                    gameState.current.player.weapon = { type: drop.type, level: drop.level };
                    // Remove picked up weapon
                    gameState.current.droppedWeapons = gameState.current.droppedWeapons.filter(d => d.id !== drop.id);
                    syncHUD();
                  }}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 transition-all"
                >
                  替换武器
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Treasure Drop Interaction */}
      {hud.status === 'playing' && hud.activeTreasureDropId !== null && (
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
          {(() => {
            const drop = gameState.current.droppedTreasures.find(d => d.id === hud.activeTreasureDropId);
            if (!drop) return null;

            return (
              <div className="flex flex-col items-center gap-3 pointer-events-auto">
                <div className="bg-zinc-900/90 backdrop-blur border border-zinc-700 p-4 rounded-xl text-center shadow-xl">
                  <p className="text-zinc-400 text-sm mb-1">发现宝物</p>
                  <p className="text-white font-bold text-lg flex items-center justify-center gap-2">
                    <Diamond className="w-5 h-5 text-purple-400" />
                    {drop.name}
                  </p>
                  <div className="flex justify-center gap-4 mt-2 text-sm">
                    <span className="text-amber-400 flex items-center gap-1"><Coins className="w-4 h-4" /> {drop.value}</span>
                    <span className="text-zinc-400 flex items-center gap-1"><Backpack className="w-4 h-4" /> {drop.weight}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const success = addTreasure(gameState.current.inventory, drop);
                    if (success) {
                      gameState.current.droppedTreasures = gameState.current.droppedTreasures.filter(d => d.id !== drop.id);
                      syncHUD();
                    } else {
                      // Optional: Show some "inventory full" feedback
                      alert("背包负重已满！");
                    }
                  }}
                  className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(147,51,234,0.3)] active:scale-95 transition-all"
                >
                  拾取宝物
                </button>
              </div>
            );
          })()}
        </div>
      )}

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

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Backpack className="w-6 h-6 text-purple-400" />
                背包
              </h2>
              <button 
                onClick={() => {
                  setShowInventoryModal(false);
                  showInventoryModalRef.current = false;
                }}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>
            
            <div className="mb-4 bg-zinc-950 rounded-xl p-4 border border-zinc-800">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">当前负重</span>
                <span className="text-white font-mono">{hud.inventory.currentWeight} / {hud.inventory.maxWeight}</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full transition-all"
                  style={{ width: `${(hud.inventory.currentWeight / hud.inventory.maxWeight) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {hud.inventory.treasures.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">
                  背包是空的
                </div>
              ) : (
                hud.inventory.treasures.map((treasure, index) => (
                  <div key={`${treasure.id}-${index}`} className="flex items-center justify-between bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50">
                    <div className="flex items-center gap-3">
                      <Diamond className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="text-white font-medium">{treasure.name}</div>
                        <div className="flex gap-3 text-xs">
                          <span className="text-amber-400 flex items-center gap-1"><Coins className="w-3 h-3" /> {treasure.value}</span>
                          <span className="text-zinc-400 flex items-center gap-1"><Backpack className="w-3 h-3" /> {treasure.weight}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const removed = removeTreasure(gameState.current.inventory, treasure.id);
                        if (removed) {
                          gameState.current.droppedTreasures.push({
                            ...removed,
                            x: gameState.current.player.x + (Math.random() * 40 - 20),
                            y: gameState.current.player.y + (Math.random() * 40 - 20)
                          });
                          syncHUD();
                        }
                      }}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors"
                    >
                      丢弃
                    </button>
                  </div>
                ))
              )}
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
      {hud.status !== 'playing' && hud.status !== 'menu' && (
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
                <p className="text-zinc-400 mb-8 text-lg">你被敌人淹没了，但保留了 <span className="text-amber-500 font-bold">{hud.coins}</span> 枚金币。</p>
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
      {/* Shop Modal */}
      {showShopModal && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative">
            <button 
              onClick={() => setShowShopModal(false)}
              className="absolute top-6 right-6 p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white flex items-center gap-4">
                <ShoppingCart className="w-8 h-8 text-blue-500" />
                购买装备
              </h2>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <span className="text-amber-500 font-mono font-bold text-xl">{globalCoins}</span>
              </div>
            </div>

            <div className="space-y-8">
              {/* Weapon Upgrade */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-blue-400" />
                  初始武器 (单次游戏)
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {(['pistol', 'shotgun', 'laser'] as WeaponType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setNextGamePerks(p => ({ ...p, weaponType: type }))}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                        nextGamePerks.weaponType === type 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      {type === 'pistol' && <Crosshair className="w-8 h-8 text-blue-400" />}
                      {type === 'shotgun' && <Target className="w-8 h-8 text-orange-400" />}
                      {type === 'laser' && <Zap className="w-8 h-8 text-sky-400" />}
                      <span className="text-white font-bold">
                        {type === 'pistol' && '手枪'}
                        {type === 'shotgun' && '霰弹枪'}
                        {type === 'laser' && '激光枪'}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-lg">武器等级: LV.{nextGamePerks.weaponLevel}</span>
                    <span className="text-zinc-400 text-sm">最高可升至 LV.3</span>
                  </div>
                  <button
                    disabled={nextGamePerks.weaponLevel >= 3 || globalCoins < 300}
                    onClick={() => {
                      if (globalCoins >= 300 && nextGamePerks.weaponLevel < 3) {
                        setGlobalCoins(prev => prev - 300);
                        setNextGamePerks(p => ({ ...p, weaponLevel: p.weaponLevel + 1 }));
                      }
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                  >
                    升级 <Coins className="w-4 h-4" /> 300
                  </button>
                </div>
              </div>

              {/* Inventory Upgrade */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Backpack className="w-5 h-5 text-purple-400" />
                  背包负重上限 (单次游戏)
                </h3>
                
                <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-lg">当前负重上限: {nextGamePerks.maxWeight}</span>
                    <span className="text-zinc-400 text-sm">最高可升至 80</span>
                  </div>
                  <button
                    disabled={nextGamePerks.maxWeight >= 80 || globalCoins < 200}
                    onClick={() => {
                      if (globalCoins >= 200 && nextGamePerks.maxWeight < 80) {
                        setGlobalCoins(prev => prev - 200);
                        setNextGamePerks(p => ({ ...p, maxWeight: p.maxWeight + 10 }));
                      }
                    }}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                  >
                    +10 负重 <Coins className="w-4 h-4" /> 200
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
