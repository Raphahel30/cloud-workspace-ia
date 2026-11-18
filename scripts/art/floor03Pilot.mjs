/**
 * Modular, editable 16-bit pixel-art sprites for the Floor 03 (Equipe IA) visual pilot.
 * Guided by R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png while maintaining independent
 * sprite layers, rear-facing monitors, and per-AI badges (ChatGPT, Codex, Antigravity, Claude).
 */
export function floor03PilotArt(art, r, p) {
  const shadow = p('12,114 90,108 114,117 36,123', '#071322');

  // 1. Warm walnut bookcase with colorful pixel binders, archive boxes, and hanging pothos
  art['f3-bookshelf'] =
    shadow +
    p('18,30 82,25 98,35 34,40', '#8f6545') +
    p('18,30 82,25 82,112 18,118', '#563c2d') +
    p('82,25 98,35 98,118 82,112', '#2f211c') +
    p('22,34 78,30 78,108 22,113', '#231917') +
    // Top archive boxes
    p('26,18 46,16 52,21 32,23', '#d9bc86') +
    r(26, 18, 18, 11, '#b6905c') +
    r(30, 22, 10, 2, '#694e34') +
    p('52,20 70,18 76,22 58,24', '#85a7b3') +
    r(52, 20, 18, 9, '#577b8a') +
    // 3 shelves of colorful binders
    (() => {
      let s = '';
      const binderColors = ['#e0a748', '#4db8c9', '#d46a64', '#72b86d', '#9385d6', '#e0d3b6', '#4a8fd6'];
      for (let row = 0; row < 3; row++) {
        const y = 37 + row * 24;
        s += p(`22,${y + 19} 78,${y + 15} 78,${y + 21} 22,${y + 25}`, '#6b4b38');
        for (let b = 0; b < 8; b++) {
          const x = 25 + b * 6;
          const bh = 13 + ((b + row) % 3) * 2;
          const by = y + 17 - Math.round(b * 0.4) - bh;
          const col = binderColors[(b + row * 3) % binderColors.length];
          s += r(x, by, 5, bh, col) + r(x + 1, by + 2, 3, 1, '#f4efe0') + r(x + 4, by, 1, bh, '#1b222e');
        }
      }
      // Hanging foliage on top corner
      for (const [vx, vy, c] of [
        [20, 24, '#5fa346'], [24, 27, '#8cc956'], [18, 30, '#498237'],
        [22, 34, '#7bb84d'], [26, 31, '#b6d96c'], [74, 24, '#5fa346'], [78, 28, '#8cc956'],
      ]) {
        s += r(vx, vy, 4, 4, c) + r(vx + 1, vy + 1, 2, 2, '#b9e075');
      }
      return s;
    })();

  // 2. Glowing cyan neon sign "EQUIPE IA" with pixel robot emblem
  art['f3-neon-sign'] =
    r(8, 34, 112, 46, '#081726') +
    r(10, 36, 108, 42, '#47d4e6') +
    r(12, 38, 104, 38, '#0c2336') +
    r(13, 39, 102, 2, '#99f3fc') +
    // Mini pixel robot emblem on left
    r(18, 47, 18, 18, '#78dce7') +
    r(20, 49, 14, 14, '#0f2c42') +
    r(23, 54, 3, 3, '#a4f7ff') +
    r(28, 54, 3, 3, '#a4f7ff') +
    r(26, 44, 2, 3, '#78dce7') +
    // Crisp 5px-tall pixel lettering: E Q U I P E   I A
    // E
    r(43, 49, 2, 13, '#d7fbff') + r(45, 49, 5, 2, '#78dce7') + r(45, 55, 4, 2, '#78dce7') + r(45, 60, 5, 2, '#78dce7') +
    // Q
    r(52, 49, 6, 2, '#78dce7') + r(52, 51, 2, 9, '#d7fbff') + r(56, 51, 2, 9, '#78dce7') + r(52, 60, 6, 2, '#78dce7') + r(57, 61, 2, 2, '#78dce7') +
    // U
    r(61, 49, 2, 11, '#d7fbff') + r(66, 49, 2, 11, '#78dce7') + r(61, 60, 7, 2, '#78dce7') +
    // I
    r(71, 49, 2, 13, '#d7fbff') +
    // P
    r(76, 49, 2, 13, '#d7fbff') + r(78, 49, 4, 2, '#78dce7') + r(81, 51, 2, 4, '#78dce7') + r(78, 55, 4, 2, '#78dce7') +
    // E
    r(85, 49, 2, 13, '#d7fbff') + r(87, 49, 5, 2, '#78dce7') + r(87, 55, 4, 2, '#78dce7') + r(87, 60, 5, 2, '#78dce7') +
    // I A
    r(96, 49, 2, 13, '#f3c87e') +
    r(101, 51, 2, 11, '#f3c87e') + r(106, 51, 2, 11, '#f3c87e') + r(103, 49, 3, 2, '#ffe4a8') + r(103, 55, 3, 2, '#f3c87e');

  // 3. Holographic Cyan Wall Panels (World map, Bar chart, AI Chip)
  art['f3-holo-map'] =
    r(14, 28, 100, 68, '#081b2c') +
    r(16, 30, 96, 64, '#3bc5d8') +
    r(18, 32, 92, 60, '#0c2a42') +
    // Grid lines
    r(18, 48, 92, 1, '#184c6b') + r(18, 66, 92, 1, '#184c6b') + r(50, 32, 1, 60, '#184c6b') + r(80, 32, 1, 60, '#184c6b') +
    // Pixel continents
    r(24, 42, 16, 10, '#62e6f5') + r(28, 52, 10, 12, '#47c8db') + r(32, 64, 7, 14, '#3ab0c4') +
    r(54, 40, 20, 12, '#62e6f5') + r(58, 52, 14, 16, '#47c8db') + r(76, 44, 24, 14, '#7bf0fc') +
    r(88, 64, 12, 10, '#47c8db') +
    r(22, 36, 4, 4, '#f3c87e') + r(82, 48, 4, 4, '#f3c87e');

  art['f3-holo-chart'] =
    r(22, 26, 84, 72, '#081b2c') +
    r(24, 28, 80, 68, '#3bc5d8') +
    r(26, 30, 76, 64, '#0c2a42') +
    r(32, 84, 64, 2, '#3d7994') +
    r(34, 66, 7, 18, '#3cb8cc') +
    r(44, 58, 7, 26, '#4bd2e6') +
    r(54, 50, 7, 34, '#69e7f5') +
    r(64, 42, 7, 42, '#82f5ff') +
    r(74, 36, 7, 48, '#a7fbff') +
    r(84, 46, 7, 38, '#f3c87e') +
    r(32, 36, 26, 3, '#78dce7');

  art['f3-holo-chip'] =
    r(12, 36, 104, 52, '#081b2c') +
    r(14, 38, 100, 48, '#3bc5d8') +
    r(16, 40, 96, 44, '#0c2a42') +
    // Chip core
    r(28, 48, 24, 24, '#4fd6e8') +
    r(31, 51, 18, 18, '#103550') +
    r(35, 55, 10, 10, '#9cf7ff') +
    // Chip pins
    r(24, 52, 4, 3, '#78dce7') + r(24, 58, 4, 3, '#78dce7') + r(24, 64, 4, 3, '#78dce7') +
    r(52, 52, 4, 3, '#78dce7') + r(52, 58, 4, 3, '#78dce7') + r(52, 64, 4, 3, '#78dce7') +
    r(33, 44, 3, 4, '#78dce7') + r(39, 44, 3, 4, '#78dce7') + r(45, 44, 3, 4, '#78dce7') +
    r(33, 72, 3, 4, '#78dce7') + r(39, 72, 3, 4, '#78dce7') + r(45, 72, 3, 4, '#78dce7') +
    // Telemetry lines on right
    r(64, 49, 36, 3, '#9cf7ff') + r(64, 56, 28, 2, '#4fd6e8') + r(64, 62, 34, 2, '#4fd6e8') + r(64, 68, 22, 2, '#f3c87e');

  // 4. Woven isometric workstation floor mat
  art['f3-rug'] =
    p('10,114 86,108 118,118 42,124', '#1d2d3d') +
    p('14,114 84,109 112,117 42,122', '#2e455b') +
    p('19,114 81,110 105,116 43,121', '#425f7a') +
    p('25,114 78,111 98,116 44,120', '#2b4054');

  // 5. High-back ergonomic office chair (matches R03_02)
  art['f3-chair'] =
    p('14,116 44,112 52,117 22,121', '#071322') +
    r(29, 98, 4, 15, '#495a69') +
    p('18,114 43,111 49,116 24,119', '#1c2a38') +
    r(19, 117, 3, 3, '#637a8c') + r(31, 117, 3, 3, '#637a8c') + r(43, 115, 3, 3, '#637a8c') +
    p('14,84 42,81 53,89 25,94', '#395166') +
    p('17,86 41,83 48,89 24,92', '#52708a') +
    // High ergonomic backrest
    p('10,56 32,53 38,59 16,62', '#5a768e') +
    p('10,56 16,62 18,88 12,85', '#1b2b3a') +
    p('16,62 38,59 40,83 18,88', '#2a4154') +
    r(20, 65, 13, 16, '#395368') +
    // Armrest
    r(36, 78, 12, 3, '#172533') + r(42, 81, 3, 8, '#384c5e');

  // 6. Warm wood workstation desk with drawer pedestal, mug & stacked books
  art['f3-desk'] =
    shadow +
    // Under-desk pedestal with 2 drawers + brass handles
    p('74,92 106,88 118,95 86,100', '#4a3224') +
    p('74,92 86,100 86,118 74,111', '#6e4c36') +
    p('86,100 118,95 118,113 86,118', '#4d3324') +
    r(89, 102, 24, 6, '#7c563d') + r(98, 104, 6, 2, '#f3c87e') +
    r(89, 110, 24, 6, '#6b4933') + r(98, 112, 6, 2, '#f3c87e') +
    // Left steel leg
    r(41, 98, 5, 20, '#3e4e5e') +
    // Wood desktop surface
    p('25,84 104,78 122,90 43,97', '#dca762') +
    p('28,85 102,80 118,89 44,95', '#edb972') +
    p('43,97 122,90 122,96 43,103', '#8a5d3b') +
    p('25,84 43,97 43,103 25,90', '#69442b') +
    r(45, 96, 30, 1, '#ffe1a1') +
    // Coffee mug on right + stacked books
    r(98, 76, 6, 8, '#e8dec8') + r(104, 78, 2, 4, '#c7baa0') + r(100, 73, 1, 2, '#b9d8e0') +
    p('106,80 117,79 117,84 106,85', '#4284a8') +
    p('107,76 116,75 116,80 107,81', '#cf8448');

  // 7. Rear-facing monitor: dark chassis & stand facing camera; glowing screen strictly faces the seated character!
  art['f3-monitor-back'] =
    // Stand base on desktop + vertical arm
    p('85,84 104,82 110,85 92,88', '#223545') +
    r(92, 77, 4, 8, '#5a7387') +
    r(90, 62, 7, 6, '#435a6c') +
    // Thin glowing left edge (the screen side facing the character at x~28)
    p('77,51 81,53 81,78 77,76', '#72e3f2') +
    p('78,53 80,54 80,75 78,74', '#bdf8ff') +
    // Rear monitor housing facing viewer (dark slate with beveled vents)
    p('81,53 106,49 109,51 109,75 81,78', '#1f3344') +
    p('83,55 105,52 105,73 83,76', '#2b4357') +
    r(87, 58, 13, 2, '#142330') +
    r(87, 62, 13, 2, '#142330') +
    r(91, 67, 6, 3, '#4c6d82');

  // 8. Cute "IA" helper robot matching R03_02
  art['f3-bot-ia'] =
    p('28,114 66,111 74,117 36,120', '#071322') +
    // Wheels / feet
    r(36, 108, 9, 8, '#233647') + r(55, 108, 9, 8, '#233647') +
    // Navy body + white armor + IA badge
    r(34, 80, 32, 28, '#294257') +
    r(37, 83, 26, 22, '#dce6e8') +
    r(41, 88, 18, 12, '#132d42') +
    r(45, 91, 2, 6, '#78dce7') + r(50, 91, 2, 6, '#f3c87e') + r(53, 91, 2, 6, '#f3c87e') + r(51, 91, 3, 2, '#f3c87e') + r(51, 94, 3, 1, '#f3c87e') +
    // Arms
    r(29, 84, 5, 14, '#5a7b8c') + r(66, 84, 5, 14, '#5a7b8c') +
    // Rounded white pixel head + dark visor + happy cyan eyes
    r(31, 52, 38, 28, '#e8f0f2') +
    r(33, 50, 34, 3, '#ffffff') +
    r(36, 57, 28, 16, '#0d2236') +
    r(41, 62, 5, 4, '#6bf0fc') + r(54, 62, 5, 4, '#6bf0fc') +
    r(42, 61, 3, 2, '#bdfaff') + r(55, 61, 3, 2, '#bdfaff') +
    // Side ear headphones
    r(28, 60, 3, 10, '#4bc8db') + r(69, 60, 3, 10, '#4bc8db');

  // 9. Per-agent station badges (ChatGPT, Codex, Antigravity, Claude Code)
  const makeBadge = (accent, iconBody) =>
    r(20, 92, 88, 26, '#081827') +
    r(22, 94, 84, 22, accent) +
    r(24, 96, 80, 18, '#10263a') +
    iconBody;

  art['f3-badge-chatgpt'] = makeBadge(
    '#34c79b',
    r(29, 100, 10, 10, '#34c79b') + r(31, 102, 6, 6, '#0f283d') + r(33, 104, 2, 2, '#9cf7dc') +
      r(44, 102, 46, 3, '#c9fceb') + r(44, 108, 30, 2, '#57d4ad'),
  );
  art['f3-badge-codex'] = makeBadge(
    '#4ea8ff',
    r(29, 101, 3, 8, '#4ea8ff') + r(32, 99, 3, 2, '#99ceff') + r(32, 109, 3, 2, '#99ceff') +
      r(38, 101, 3, 8, '#4ea8ff') + r(44, 102, 40, 3, '#d4ebff') + r(44, 108, 26, 2, '#69b6ff'),
  );
  art['f3-badge-antigravity'] = makeBadge(
    '#f3c87e',
    r(33, 99, 2, 12, '#ffe5a3') + r(29, 104, 10, 2, '#f3c87e') + r(31, 102, 6, 6, '#ffd27d') +
      r(44, 102, 52, 3, '#fff0c4') + r(44, 108, 36, 2, '#f3c87e'),
  );
  art['f3-badge-claude'] = makeBadge(
    '#e88d67',
    r(31, 100, 6, 10, '#e88d67') + r(29, 102, 10, 6, '#f2ab8a') + r(33, 104, 2, 2, '#fff0e8') +
      r(44, 102, 44, 3, '#ffe2d4') + r(44, 108, 28, 2, '#e88d67'),
  );
}
