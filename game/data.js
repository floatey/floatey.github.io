// ════════════════════════════════════════════════════════════════
//  JDM RESTORATION GARAGE — Game Data (Pure JS, no JSX)
//  Loaded as a regular <script> before Babel-compiled components.
//  Everything attaches to window.GD (Game Data namespace).
// ════════════════════════════════════════════════════════════════
(function() {
"use strict";

const GD = {};

// ── RARITY ──
GD.RARITY_COLORS = { 3: "#6b7280", 4: "#a855f7", 5: "#f59e0b" };
GD.RARITY_NAMES  = { 3: "Common", 4: "Rare", 5: "Legendary" };
GD.RARITY_BG     = { 3: "#6b728018", 4: "#a855f718", 5: "#f59e0b18" };

// ── CONDITION THRESHOLDS ──
GD.CONDITION_TABLE = [
  [0.00, 0.10, "DESTROYED", "#ff4d6d"],
  [0.11, 0.30, "CRITICAL",  "#f97316"],
  [0.31, 0.50, "POOR",      "#eab308"],
  [0.51, 0.70, "FAIR",      "#84cc16"],
  [0.71, 0.89, "GOOD",      "#22c55e"],
  [0.90, 1.00, "EXCELLENT", "#10b981"],
];

GD.CRITICAL_SYSTEMS = ["engine", "fuel", "cooling", "exhaust", "electrical", "drivetrain"];

// ── PROFILES ──
GD.PROFILES = [
  { id: "nick",     name: "Nick",     color: "#b87fff", initials: "NI" },
  { id: "tarro",    name: "Tarro",    color: "#ff5270", initials: "TA" },
  { id: "nathan",   name: "Nathan",   color: "#4e9fff", initials: "NA" },
  { id: "damian",   name: "Damian",   color: "#2ed09b", initials: "DA" },
  { id: "harrison", name: "Harrison", color: "#fbbf24", initials: "HA" },
];

// ── VEHICLE ROSTER ──
GD.VEHICLES = [
  { id: "ae86",    name: "1985 Toyota AE86 Sprinter Trueno",  engine: "4A-GE 1.6L I4",          rarity: 3, lore: "The people's drifter. Takumi's ride." },
  { id: "crx",     name: "1991 Honda CRX Si",                 engine: "D16A6 1.6L I4",           rarity: 3, lore: "Rust bucket with a heart of gold." },
  { id: "z31",     name: "1986 Nissan 300ZX",                 engine: "VG30E 3.0L V6",           rarity: 3, lore: "V6 vacuum spaghetti and T-top leaks." },
  { id: "aw11",    name: "1988 Toyota MR2",                   engine: "4A-GE 1.6L I4",           rarity: 3, lore: "Mid-engine, mid-budget, maximum fun." },
  { id: "s13",     name: "1993 Nissan 240SX",                 engine: "KA24DE 2.4L I4",          rarity: 4, lore: "Drift tax victim. Undoing the damage." },
  { id: "fc3s",    name: "1989 Mazda RX-7 FC3S",              engine: "13B-T Rotary Turbo",       rarity: 4, lore: "First rotary. Port city." },
  { id: "eclipse", name: "1995 Mitsubishi Eclipse GSX",       engine: "4G63T 2.0L I4 Turbo",     rarity: 4, lore: "DSM reliability is an oxymoron." },
  { id: "dc2",     name: "1997 Honda Integra Type R",         engine: "B18C5 1.8L I4 VTEC",      rarity: 4, lore: "8400 RPM of naturally aspirated perfection." },
  { id: "fd3s",    name: "1993 Mazda RX-7 FD3S",              engine: "13B-REW Twin-Turbo",       rarity: 5, lore: "Sequential twin-turbo rotary. The vacuum labyrinth." },
  { id: "sti",     name: "2006 Subaru WRX STI",               engine: "EJ257 2.5L H4 Turbo",     rarity: 5, lore: "Ringland failure waiting to happen." },
  { id: "supra",   name: "1994 Toyota Supra RZ",              engine: "2JZ-GTE 3.0L I6 TT",      rarity: 5, lore: "Inline-six royalty. Is that stock?" },
  { id: "bnr34",   name: "1999 Nissan Skyline GT-R",          engine: "RB26DETT 2.6L I6 TT",     rarity: 5, lore: "Godzilla. The endgame." },
];

// ── TOOL SHOP ──
GD.TOOLS = [
  { id: "impact_wrench",     name: "Impact Wrench",          mechanic: "wrench",    effect: "Every 15th click = auto-5× burst",   cost: 500 },
  { id: "penetrating_oil",   name: "Penetrating Oil (×10)",  mechanic: "wrench",    effect: "−30% resistance on 1 job",           cost: 50, consumable: true },
  { id: "torque_wrench",     name: "Torque Wrench",          mechanic: "precision", effect: "−15% sweep speed",                   cost: 800 },
  { id: "angle_gauge",       name: "Angle Gauge",            mechanic: "precision", effect: "Green zone +10% wider",              cost: 600 },
  { id: "multimeter",        name: "Multimeter",             mechanic: "diagnosis", effect: "Reveals 1 extra clue always",        cost: 400 },
  { id: "compression_tester",name: "Compression Tester",     mechanic: "diagnosis", effect: "Exact compression numbers",          cost: 350 },
  { id: "boost_leak_tester", name: "Boost Leak Tester",      mechanic: "diagnosis", effect: "Exact boost leak source",            cost: 450 },
  { id: "da_polisher",       name: "DA Polisher",            mechanic: "bodywork",  effect: "2× fill rate",                       cost: 700 },
  { id: "media_blaster",     name: "Media Blaster",          mechanic: "bodywork",  effect: "Instant-clear rust zones",           cost: 1200 },
];

// ── SKILL TIERS ──
GD.SKILL_TIERS = [
  { min: 1,  max: 5,  title: "Apprentice",   bonus: 0 },
  { min: 6,  max: 10, title: "Shade Tree",    bonus: 0.10 },
  { min: 11, max: 15, title: "Journeyman",    bonus: 0.20 },
  { min: 16, max: 20, title: "Master Tech",   bonus: 0.30 },
];

// ── GACHA PULL FLAVOR TEXT ──
GD.PULL_FLAVOR = {
  intro: [
    "Walking the yard...", "Poking through the back rows...", "Something glints under a tarp...",
    "The old man points to a corner of the lot...", "Weeds growing through the engine bay...",
  ],
  3: ["Sitting in the weeds with flat tires. Not bad, not great.", "Covered in dust but the body's straight.", "The paint is chalky and the interior smells, but she's solid underneath."],
  4: ["Under a carport behind the main lot. Someone cared about this one.", "Half-covered by a tarp. The exposed side has patina, the other side... not bad.", "The owner's son was going to restore it. Never got around to it."],
  5: ["Holy... is that what I think it is?", "Buried behind two rows of parts cars. She's been hiding.", "The owner doesn't even know what he has. Don't tell him."],
};

// ══════════════════════════════════════════════════════════════
//  AE86 PART TREE — Phase 2 (with mixed repair types + diagnostics)
// ══════════════════════════════════════════════════════════════
GD.PART_TREES = {};
GD.PART_TREES.ae86 = {
  modelId: "ae86", displayName: "1985 Toyota AE86 Sprinter Trueno",
  chassisCode: "AE86", engineCode: "4A-GE", rarity: 3,
  arrivalConditionRange: [0.20, 0.45],
  firstStartText: "The 4A-GE catches and spins up to 1200 RPM... settles at 900. That twin-cam scream is still in there. She's alive.",
  loreBlurb: "The people's drifter. Takumi's ride. A 1.6L NA four-banger that punches way above its weight.",
  systems: [
    // ── ENGINE ──
    { id: "engine", name: "Engine (4A-GE)", type: "detailed", subsystems: [
      { id: "engine_top", name: "Cylinder Head", parts: [
        { id: "ae86_valve_cover_gasket", name: "Valve Cover Gasket", repairType: "wrench", difficulty: 0.2, canRepair: true, replaceCost: 25, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null,
          flavorText: ["Cork gasket, old school. Probably hardened to stone.", "Peel it off and pray the surface isn't pitted.", "These leak on every AE86 ever. It's tradition."] },
        { id: "ae86_spark_plugs", name: "Spark Plugs (×4)", repairType: "precision", difficulty: 0.2, canRepair: false, replaceCost: 40, sourceRarity: "common", prerequisites: ["ae86_valve_cover_gasket"],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "ae86_plug_well_oil", chance: 0.5, flavorText: "Oil pooling in the plug wells. Valve cover gasket was definitely shot." },
          flavorText: ["NGK BPR6ES. Gap them to spec — 0.031 inch.", "Four cylinders, four chances to find problems.", "Pull 'em and read the tips."] },
        { id: "ae86_plug_well_oil", name: "Plug Well Oil Contamination", repairType: "wrench", difficulty: 0.1, canRepair: true, replaceCost: 0, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Wipe it out. The new gasket fixes the cause.", "Oil where it shouldn't be. Classic.", "Clean the wells before new plugs go in."] },
        { id: "ae86_distributor_cap", name: "Distributor Cap & Rotor", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 55, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Carbon tracking inside the cap. Misfires guaranteed.", "The rotor tip is worn to nothing.", "Old-school ignition. No coil packs here."] },
        { id: "ae86_timing_belt", name: "Timing Belt", repairType: "wrench", difficulty: 0.6, canRepair: false, replaceCost: 85, sourceRarity: "uncommon", prerequisites: ["ae86_valve_cover_gasket"],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "ae86_timing_tensioner", chance: 0.7, flavorText: "With the belt off you can feel the tensioner wobble." },
          flavorText: ["Interference engine. If this snaps, valves meet pistons.", "Count the teeth — if any are missing, you got lucky.", "The one job you don't skip on a 4A-GE."] },
        { id: "ae86_timing_tensioner", name: "Timing Belt Tensioner", repairType: "wrench", difficulty: 0.35, canRepair: false, replaceCost: 60, sourceRarity: "uncommon", prerequisites: ["ae86_timing_belt"],
          hiddenReveal: null, flavorText: ["The bearing is crunchy.", "While you're in there, just replace it.", "Spin it by hand — sounds like gravel."] },
        { id: "ae86_head_gasket", name: "Head Gasket", repairType: "precision", difficulty: 0.75, canRepair: false, replaceCost: 120, sourceRarity: "uncommon", prerequisites: ["ae86_timing_belt", "ae86_intake_manifold_gasket"],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "ae86_head_surface", chance: 0.4, flavorText: "Erosion around cylinder #3. Might need surfacing." },
          flavorText: ["MLS gasket. Head bolt torque sequence: star pattern, three stages.", "The big job. Clear your afternoon.", "Check for coolant weeping between cylinders."] },
        { id: "ae86_head_surface", name: "Head Surface Warping", repairType: "bodywork", difficulty: 0.55, canRepair: true, replaceCost: 200, sourceRarity: "rare", prerequisites: ["ae86_head_gasket"],
          hiddenReveal: null, flavorText: ["Straightedge and feeler gauge. How flat is flat enough?", "More than 0.002\" means machine work.", "Aluminum warps if it ever overheated. They all overheated."] },
      ]},
      { id: "engine_bottom", name: "Engine Accessories", parts: [
        { id: "ae86_intake_manifold_gasket", name: "Intake Manifold Gasket", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 30, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Vacuum leaks cause lean conditions. Replace it.", "Paper gasket, crumbles when you look at it.", "Clean both surfaces. No shortcuts."] },
        { id: "ae86_water_pump", name: "Water Pump", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 75, sourceRarity: "common", prerequisites: ["ae86_timing_belt"],
          hiddenReveal: null, flavorText: ["Driven off the timing belt. Two birds, one job.", "Weep hole is crusty. She's been seeping.", "Always replace with the timing belt."] },
        { id: "ae86_alt_belt", name: "Alternator Belt", repairType: "wrench", difficulty: 0.15, canRepair: false, replaceCost: 20, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Cracked and glazed. Squeals on cold starts.", "V-belt. Old school tension adjustment.", "Five minute job."] },
        { id: "ae86_oil_pan_gasket", name: "Oil Pan Gasket", repairType: "wrench", difficulty: 0.35, canRepair: false, replaceCost: 30, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Every parking spot has an oil stain.", "Cork gasket turned to cardboard.", "RTV and prayers if you can't find the right one."] },
      ]},
    ]},
    // ── FUEL ──
    { id: "fuel", name: "Fuel System", type: "detailed", subsystems: [
      { id: "fuel_delivery", name: "Fuel Delivery", parts: [
        { id: "ae86_fuel_pump", name: "Fuel Pump", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 95, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Mechanical pump. Listen for the tick.", "Diaphragm pump. This one's tired.", "Check outlet pressure: 2.5-3.0 PSI."] },
        { id: "ae86_fuel_filter", name: "Fuel Filter", repairType: "wrench", difficulty: 0.15, canRepair: false, replaceCost: 15, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Inline filter, probably original. 40 years of gunk.", "Blow through it. If you can't, problem found.", "Cheap part, easy swap. No excuse."] },
        { id: "ae86_fuel_lines", name: "Fuel Line Sections", repairType: "wrench", difficulty: 0.3, canRepair: true, replaceCost: 45, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Rubber sections cracking. Fire hazard.", "Steel lines fine, rubber connections toast.", "Replace every rubber section. Not negotiable."] },
        { id: "ae86_carb_rebuild", name: "Carburetor Rebuild", repairType: "precision", difficulty: 0.6, canRepair: true, replaceCost: 120, sourceRarity: "uncommon", prerequisites: ["ae86_fuel_filter"],
          hiddenReveal: { revealsOnAction: "repair", targetPartId: "ae86_carb_float", chance: 0.6, flavorText: "Float's saturated. Sinking instead of floating. That explains the rich running." },
          flavorText: ["Needle and seat, accelerator pump, all the jets.", "Soak every passage in carb cleaner.", "Analog charm. No ECU to blame."] },
        { id: "ae86_carb_float", name: "Carburetor Float", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 35, sourceRarity: "uncommon", prerequisites: ["ae86_carb_rebuild"],
          hiddenReveal: null, flavorText: ["Brass float, saturated. Heavy as a sinker.", "Replace it, set the float height.", "This is why it was running rich."] },
      ]},
    ]},
    // ── COOLING ──
    { id: "cooling", name: "Cooling System", type: "detailed", subsystems: [
      { id: "cooling_main", name: "Cooling Circuit", parts: [
        { id: "ae86_radiator", name: "Radiator", repairType: "wrench", difficulty: 0.35, canRepair: true, replaceCost: 150, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Fins crushed, end tanks seeping.", "Copper-brass. They don't make 'em like this anymore.", "Pressure test it. Leaks within 30 seconds."] },
        { id: "ae86_thermostat", name: "Thermostat", repairType: "wrench", difficulty: 0.15, canRepair: false, replaceCost: 15, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Stuck open? Stuck closed? Either way, not working.", "Boil it to test. Kitchen mechanics.", "82°C stat. Don't go cold, the 4A-GE likes warmth."] },
        { id: "ae86_coolant_hoses", name: "Coolant Hoses (set)", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 55, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Squeeze test: crunchy or mushy = replace all.", "Upper, lower, heater, bypass. Full set.", "OEM rubber's fine. Save the money."] },
        { id: "ae86_rad_cap", name: "Radiator Cap", repairType: "wrench", difficulty: 0.05, canRepair: false, replaceCost: 10, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["0.9 bar cap. Cheapest fix, biggest impact.", "Rubber seal is flat. No pressure = bad cooling.", "Costs less than a sandwich. Just replace it."] },
      ]},
    ]},
    // ── EXHAUST ──
    { id: "exhaust", name: "Exhaust System", type: "detailed", subsystems: [
      { id: "exhaust_main", name: "Exhaust Path", parts: [
        { id: "ae86_exhaust_manifold", name: "Exhaust Manifold", repairType: "wrench", difficulty: 0.5, canRepair: true, replaceCost: 180, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "ae86_manifold_studs", chance: 0.8, flavorText: "Two studs snapped flush with the head. Of course." },
          flavorText: ["Cast iron 4-1. Check for cracks at the collector.", "Warp and crack from heat cycling. AE86 experience.", "If it's not cracked, you're lucky."] },
        { id: "ae86_manifold_studs", name: "Broken Manifold Studs", repairType: "wrench", difficulty: 0.65, canRepair: true, replaceCost: 40, sourceRarity: "common", prerequisites: ["ae86_exhaust_manifold"],
          hiddenReveal: null, flavorText: ["Easy-outs and penetrating oil. This'll take a while.", "Drill, extract, re-tap. Three stages of grief.", "Previous owner used an impact. Thanks."] },
        { id: "ae86_cat", name: "Catalytic Converter", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 200, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Rattle it. Marbles = broken substrate.", "40 years old and probably gutted.", "Check state laws before deciding."] },
        { id: "ae86_muffler", name: "Muffler & Tail Pipe", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 85, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Rusted through. Finger goes right through it.", "Stock muffler. Too quiet for some.", "Bolt-on replacement. Easiest job on the car."] },
      ]},
    ]},
    // ── DRIVETRAIN ──
    { id: "drivetrain", name: "Drivetrain", type: "detailed", subsystems: [
      { id: "dt_clutch", name: "Clutch Assembly", parts: [
        { id: "ae86_clutch_disc", name: "Clutch Disc", repairType: "wrench", difficulty: 0.6, canRepair: false, replaceCost: 110, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Organic disc, worn to rivets. Slipping.", "T50 transmission pull. Clear your weekend.", "How many launches? Too many."] },
        { id: "ae86_pressure_plate", name: "Pressure Plate", repairType: "precision", difficulty: 0.5, canRepair: false, replaceCost: 95, sourceRarity: "uncommon", prerequisites: ["ae86_clutch_disc"],
          hiddenReveal: null, flavorText: ["Hot spots on the friction surface.", "Diaphragm spring tension check. Replace with disc.", "Torque the bolts in a star pattern."] },
        { id: "ae86_throwout_bearing", name: "Throw-Out Bearing", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 35, sourceRarity: "common", prerequisites: ["ae86_clutch_disc"],
          hiddenReveal: null, flavorText: ["Spin it. That grinding = done.", "While you're in there...", "Cheap part, expensive to reach."] },
        { id: "ae86_rear_diff_oil", name: "Rear Differential Fluid", repairType: "wrench", difficulty: 0.15, canRepair: true, replaceCost: 25, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Drain it. Glittery = bigger problems.", "GL-5 75W-90. Fill to check plug.", "Smells like sulfur and broken dreams."] },
      ]},
      { id: "dt_axle", name: "Rear Axle", parts: [
        { id: "ae86_axle_seals", name: "Rear Axle Seals", repairType: "precision", difficulty: 0.35, canRepair: false, replaceCost: 40, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Gear oil on brake shoes = bad combo.", "Press new ones in straight.", "Live axle simplicity."] },
      ]},
    ]},
    // ── BRAKES ──
    { id: "brakes", name: "Brakes", type: "detailed", subsystems: [
      { id: "brakes_front", name: "Front Brakes", parts: [
        { id: "ae86_front_pads", name: "Front Brake Pads", repairType: "wrench", difficulty: 0.15, canRepair: false, replaceCost: 35, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Metal on metal. What pad material?", "Single-piston sliding caliper.", "Bed them in. 10 stops from 30mph."] },
        { id: "ae86_front_rotors", name: "Front Rotors", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 60, sourceRarity: "common", prerequisites: ["ae86_front_pads"],
          hiddenReveal: null, flavorText: ["Below minimum thickness. Replace.", "Lip on the edge. Way past worn.", "Solid rotors, not vented. Adequate."] },
      ]},
      { id: "brakes_rear", name: "Rear Brakes", parts: [
        { id: "ae86_rear_drums", name: "Rear Drum Brakes", repairType: "wrench", difficulty: 0.35, canRepair: true, replaceCost: 55, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Drums. Because 1985.", "Springs, adjusters, shoes. The puzzle.", "Self-adjusting. In theory."] },
        { id: "ae86_brake_lines", name: "Brake Lines", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 70, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Rubber flex lines swelling. Brake fade guaranteed.", "Steel lines have surface rust. Acceptable.", "Bleed after. DOT4, not DOT3."] },
        { id: "ae86_master_cyl", name: "Brake Master Cylinder", repairType: "precision", difficulty: 0.5, canRepair: false, replaceCost: 90, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Pedal to the floor? Internal bypass.", "Rebuild kit or full replacement.", "Bench bleed before install."] },
      ]},
    ]},
    // ── SUSPENSION ──
    { id: "suspension", name: "Suspension", type: "detailed", subsystems: [
      { id: "susp_front", name: "Front Suspension", parts: [
        { id: "ae86_front_struts", name: "Front Struts", repairType: "wrench", difficulty: 0.5, canRepair: false, replaceCost: 160, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["MacPherson struts. Leaking oil.", "Bounce test: push down, should settle once.", "Spring compressors. Respect the energy."] },
        { id: "ae86_tie_rod_ends", name: "Tie Rod Ends", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 45, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Grab and shake. Play = replacement.", "Boot's torn, grease gone, ball loose.", "Get an alignment after."] },
        { id: "ae86_front_bushings", name: "Control Arm Bushings", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 55, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Rubber turned to powder.", "Press job. Or torch and BFH.", "Poly upgrade? More feedback, more NVH."] },
      ]},
      { id: "susp_rear", name: "Rear Suspension", parts: [
        { id: "ae86_rear_shocks", name: "Rear Shocks", repairType: "wrench", difficulty: 0.35, canRepair: false, replaceCost: 120, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Live axle four-link. Simple.", "Blown. Bounces like a lowrider.", "Two bolts per shock. 20 minutes if not rusted."] },
        { id: "ae86_rear_springs", name: "Rear Leaf Springs", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 100, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Sagging 2 inches below stock.", "Check lateral rod bushings too.", "Leaf springs in a drift car. Somehow works."] },
        { id: "ae86_sway_bar_links", name: "Sway Bar End Links", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 25, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Clunk over bumps? End links.", "Ball joints gone. Floppy as noodles.", "Best fix-to-effort ratio on the car."] },
      ]},
    ]},
    // ── BUNDLE SYSTEMS ──
    { id: "interior",    name: "Interior",           type: "bundle", repairType: "bodywork", difficulty: 0.35, bundleCost: 400, gridSize: [3,5],
      flavorText: ["Cracked dash, sun-faded seats, mystery stains. Full Hachiroku experience.", "Someone put an aftermarket wheel on. Not a good one."] },
    { id: "electrical",  name: "Electrical",         type: "bundle", repairType: "diagnosis", difficulty: 0.4, bundleCost: 350, gridSize: [2,3],
      flavorText: ["Fusible links, corroded grounds, one aftermarket alarm nobody has the remote for.", "The wiring harness has seen better decades."] },
    { id: "body",        name: "Body & Panels",      type: "bundle", repairType: "bodywork", difficulty: 0.5, bundleCost: 600, gridSize: [3,5],
      flavorText: ["Fender rust, rocker panel cancer, mystery dent on the passenger door.", "The panda Trueno look requires actual paint, not rattle cans."] },
    { id: "glass",       name: "Glass",              type: "bundle", repairType: "bodywork", difficulty: 0.2, bundleCost: 250, gridSize: [2,3],
      flavorText: ["Windshield cracked corner to corner. Pop-up covers hazed.", "JDM glass is getting impossible to find."] },
    { id: "trim",        name: "Trim & Weatherstrip", type: "bundle", repairType: "bodywork", difficulty: 0.15, bundleCost: 150, gridSize: [2,3],
      flavorText: ["Every rubber seal cracked. Wind noise is deafening.", "The Sprinter Trueno badge held on by hope alone."] },
  ],
  // ── DIAGNOSTIC SCENARIOS ──
  diagnosticScenarios: [
    { id: "ae86_diag_misfire", symptom: "Engine misfires and stumbles at idle, occasionally backfires through the intake.",
      clues: { free: ["Spark plugs are oil-fouled on cylinders 1 and 4.", "Distributor cap has visible carbon tracking."],
               multimeter: "Primary ignition coil resistance: 1.8Ω (spec: 1.3-1.6Ω). Slightly high.",
               compressionTester: "Compression: #1: 145psi, #2: 150psi, #3: 148psi, #4: 142psi — all within spec." },
      correctDiagnosis: "ae86_distributor_cap", wrongOptions: ["ae86_spark_plugs", "ae86_head_gasket", "ae86_timing_belt"],
      multiLayer: null },
    { id: "ae86_diag_oil_leak", symptom: "Oil dripping from the top of the engine. Pooling on the exhaust manifold — smells like burning.",
      clues: { free: ["Oil is fresh and wet along the entire valve cover mating surface.", "No oil visible from the bottom of the engine."],
               multimeter: "Not applicable to this diagnosis." },
      correctDiagnosis: "ae86_valve_cover_gasket", wrongOptions: ["ae86_head_gasket", "ae86_oil_pan_gasket", "ae86_timing_tensioner"],
      multiLayer: null },
    { id: "ae86_diag_overheat", symptom: "Temperature gauge climbs to the red zone when sitting in traffic. Returns to normal on the highway.",
      clues: { free: ["Radiator fans kick on but the lower hose stays cool to the touch.", "No visible coolant leaks with the engine running."],
               compressionTester: "Compression normal. No coolant in cylinders." },
      correctDiagnosis: "ae86_thermostat", wrongOptions: ["ae86_radiator", "ae86_water_pump", "ae86_coolant_hoses"],
      multiLayer: null },
    { id: "ae86_diag_brakes", symptom: "Brake pedal slowly sinks to the floor when holding pressure at a stoplight.",
      clues: { free: ["No visible fluid leaks at any wheel.", "Brake fluid reservoir level is slightly low."],
               multimeter: "Not applicable to this diagnosis." },
      correctDiagnosis: "ae86_master_cyl", wrongOptions: ["ae86_brake_lines", "ae86_front_pads", "ae86_rear_drums"],
      multiLayer: null },
  ],
};

// Export to window
window.GD = GD;
})();
