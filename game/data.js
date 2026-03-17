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
    { id: "ae86_diag_misfire", systemId: "engine", symptom: "Engine misfires and stumbles at idle, occasionally backfires through the intake.",
      clues: { free: ["Spark plugs are oil-fouled on cylinders 1 and 4.", "Distributor cap has visible carbon tracking."],
               multimeter: "Primary ignition coil resistance: 1.8Ω (spec: 1.3-1.6Ω). Slightly high.",
               compressionTester: "Compression: #1: 145psi, #2: 150psi, #3: 148psi, #4: 142psi — all within spec." },
      correctDiagnosis: "ae86_distributor_cap", wrongOptions: ["ae86_spark_plugs", "ae86_head_gasket", "ae86_timing_belt"],
      multiLayer: null },
    { id: "ae86_diag_oil_leak", systemId: "engine", symptom: "Oil dripping from the top of the engine. Pooling on the exhaust manifold — smells like burning.",
      clues: { free: ["Oil is fresh and wet along the entire valve cover mating surface.", "No oil visible from the bottom of the engine."],
               multimeter: "Not applicable to this diagnosis." },
      correctDiagnosis: "ae86_valve_cover_gasket", wrongOptions: ["ae86_head_gasket", "ae86_oil_pan_gasket", "ae86_timing_tensioner"],
      multiLayer: null },
    { id: "ae86_diag_overheat", systemId: "cooling", symptom: "Temperature gauge climbs to the red zone when sitting in traffic. Returns to normal on the highway.",
      clues: { free: ["Radiator fans kick on but the lower hose stays cool to the touch.", "No visible coolant leaks with the engine running."],
               compressionTester: "Compression normal. No coolant in cylinders." },
      correctDiagnosis: "ae86_thermostat", wrongOptions: ["ae86_radiator", "ae86_water_pump", "ae86_coolant_hoses"],
      multiLayer: null },
    { id: "ae86_diag_brakes", systemId: "brakes", symptom: "Brake pedal slowly sinks to the floor when holding pressure at a stoplight.",
      clues: { free: ["No visible fluid leaks at any wheel.", "Brake fluid reservoir level is slightly low."],
               multimeter: "Not applicable to this diagnosis." },
      correctDiagnosis: "ae86_master_cyl", wrongOptions: ["ae86_brake_lines", "ae86_front_pads", "ae86_rear_drums"],
      multiLayer: null },
  ],
};

// ══════════════════════════════════════════════════════════════
//  MULTI-MECHANIC SEQUENCES (spec §5 — Multi-Mechanic Sequences)
//  Each sequence chains multiple mechanics together.
//  Steps: mechanic (wrench|precision|diagnosis|bodywork),
//         partId (references part in the tree), action (remove|repair|install|assemble),
//         scenarioId (for diagnosis steps)
// ══════════════════════════════════════════════════════════════
GD.SEQUENCES = {};

// AE86 Timing Belt + Tensioner job
// 1. Wrench off timing cover and belt
// 2. Diagnosis: inspect tensioner — rebuildable or not?
// 3. Precision: torque new belt tensioner bolts (star pattern)
// 4. Wrench: reinstall belt and cover
GD.SEQUENCES.ae86_timing_belt_job = {
  id: "ae86_timing_belt_job",
  name: "Timing Belt & Tensioner",
  vehicleId: "ae86",
  triggerPartId: "ae86_timing_belt",
  steps: [
    {
      mechanic: "wrench",
      partId: "ae86_timing_belt",
      action: "remove",
      label: "Step 1/4 — Remove timing belt",
      flavorIntro: "Pull the upper cover first. Three 10mm bolts hiding behind the alternator.",
    },
    {
      mechanic: "diagnosis",
      scenarioId: "ae86_diag_timing_tensioner",
      label: "Step 2/4 — Inspect tensioner",
      flavorIntro: "With the belt off, spin the tensioner pulley by hand. Feel that gravel?",
    },
    {
      mechanic: "precision",
      partId: "ae86_timing_tensioner",
      action: "assemble",
      label: "Step 3/4 — Torque tensioner bolts",
      flavorIntro: "18 ft-lbs, then back off a quarter turn. Don't skip this.",
    },
    {
      mechanic: "wrench",
      partId: "ae86_timing_belt",
      action: "install",
      label: "Step 4/4 — Install new belt",
      flavorIntro: "Route the belt. Verify timing marks before tensioning. This is the one you don't get wrong.",
    },
  ],
};

// AE86 Head Gasket R&R — the big job
// 1. Wrench: pull intake manifold
// 2. Precision: remove head bolts in sequence (reverse star)
// 3. Diagnosis: inspect head surface for warping
// 4. Precision: torque new head gasket bolts (3-stage star pattern)
GD.SEQUENCES.ae86_head_gasket_job = {
  id: "ae86_head_gasket_job",
  name: "Head Gasket R&R",
  vehicleId: "ae86",
  triggerPartId: "ae86_head_gasket",
  steps: [
    {
      mechanic: "wrench",
      partId: "ae86_intake_manifold_gasket",
      action: "remove",
      label: "Step 1/4 — Remove intake manifold",
      flavorIntro: "Drain the coolant first. Then vacuum lines, fuel, all that spaghetti.",
    },
    {
      mechanic: "precision",
      partId: "ae86_head_gasket",
      action: "remove",
      label: "Step 2/4 — Remove head bolts (reverse star)",
      flavorIntro: "Loosen in the reverse torque sequence. Even if they're tight — especially if they're tight.",
    },
    {
      mechanic: "diagnosis",
      scenarioId: "ae86_diag_head_surface_check",
      label: "Step 3/4 — Inspect head surface",
      flavorIntro: "Straightedge and feeler gauge. How bad is it?",
    },
    {
      mechanic: "precision",
      partId: "ae86_head_gasket",
      action: "assemble",
      label: "Step 4/4 — Torque new head gasket (3-stage)",
      flavorIntro: "MLS gasket. Three stages: 22 ft-lbs, 36 ft-lbs, final 90° angle turn. Star pattern every stage.",
    },
  ],
};

// Add inline diagnostic scenarios used only in sequences
// (in addition to the ones in the part tree)
GD.SEQUENCE_SCENARIOS = {
  ae86_diag_timing_tensioner: {
    id: "ae86_diag_timing_tensioner", systemId: "engine",
    symptom: "Tensioner pulley doesn't spin freely — grinding resistance when turned by hand.",
    clues: {
      free: ["Bearing feels notchy. Definitely not smooth.", "Original OEM part. 40 years old."],
      multimeter: "Not applicable — mechanical bearing check only.",
    },
    correctDiagnosis: "ae86_timing_tensioner",
    wrongOptions: ["ae86_timing_belt", "ae86_water_pump", "ae86_alt_belt"],
    multiLayer: null,
  },
  ae86_diag_head_surface_check: {
    id: "ae86_diag_head_surface_check", systemId: "engine",
    symptom: "Cylinder head removed. Need to assess whether the mating surface requires machine work.",
    clues: {
      free: ["Visible discoloration near cylinder #3 border.", "Previous owner's repair history: unknown."],
      compressionTester: "Compression before teardown: #1: 142psi, #2: 148psi, #3: 140psi, #4: 147psi. #3 slightly low.",
    },
    correctDiagnosis: "ae86_head_surface",
    wrongOptions: ["ae86_head_gasket", "ae86_spark_plugs", "ae86_valve_cover_gasket"],
    multiLayer: null,
  },
};


// ══════════════════════════════════════════════════════════════
//  CRX PART TREE — ★★★ Common (bodywork-heavy, engine is fine)
// ══════════════════════════════════════════════════════════════
GD.PART_TREES.crx = {
  modelId: "crx", displayName: "1991 Honda CRX Si", chassisCode: "EF8", engineCode: "D16A6", rarity: 3,
  arrivalConditionRange: [0.20, 0.45],
  firstStartText: "The D16 fires on the second crank. Revs settle at 800 RPM — smooth and crisp. Forty MPG and a smile.",
  loreBlurb: "Honda's masterpiece of form-follows-function. Lightweight, efficient, and buried in rust from the rocker panels up.",
  systems: [
    { id: "engine", name: "Engine (D16A6)", type: "detailed", subsystems: [
      { id: "eng_top", name: "Cylinder Head", parts: [
        { id: "crx_valve_cover_gasket", name: "Valve Cover Gasket", repairType: "wrench", difficulty: 0.2, canRepair: true, replaceCost: 20, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["DOHC ZC sibling. These always seep.", "Half-moon seals too. Don't forget them.", "Oil on exhaust equals burning smell for days."] },
        { id: "crx_spark_plugs", name: "Spark Plugs (×4)", repairType: "precision", difficulty: 0.2, canRepair: false, replaceCost: 35, sourceRarity: "common", prerequisites: ["crx_valve_cover_gasket"],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "crx_plug_well_oil", chance: 0.45, flavorText: "Trace oil in the plug wells. The valve cover gasket was definitely weeping." },
          flavorText: ["NGK BKR6E. 90k on these plugs and it shows.", "Read the tips: four cylinder, four stories.", "The D16 likes fresh plugs. Idle cleans right up."] },
        { id: "crx_plug_well_oil", name: "Plug Well Oil Seepage", repairType: "wrench", difficulty: 0.1, canRepair: true, replaceCost: 0, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Wipe it out. New gasket fixes the source.", "Not a disaster. Just annoying.", "Clean before the new plugs go in."] },
        { id: "crx_distributor", name: "Distributor Cap & Rotor", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 60, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Tracking inside the cap. Cylinder-1 goes first.", "Integral advance unit. Whole assembly is easiest.", "OBD0 Honda. Simple and reliable, until it isn't."] },
        { id: "crx_timing_belt", name: "Timing Belt", repairType: "wrench", difficulty: 0.55, canRepair: false, replaceCost: 80, sourceRarity: "uncommon", prerequisites: ["crx_valve_cover_gasket"],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "crx_timing_tensioner", chance: 0.65, flavorText: "Tensioner pulley wobbles when you spin it. That's a bearing on its way out." },
          flavorText: ["Non-interference on some trims, interference on others. Don't guess.", "Honda timing belt service. Inspect everything behind the cover.", "90k interval. This one's past due."] },
        { id: "crx_timing_tensioner", name: "Timing Belt Tensioner", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 50, sourceRarity: "uncommon", prerequisites: ["crx_timing_belt"],
          hiddenReveal: null, flavorText: ["Spring-loaded. Check the spring tension before reassembly.", "Crunchy bearing. Just replace it.", "While you're in there is not optional."] },
        { id: "crx_head_gasket", name: "Head Gasket", repairType: "precision", difficulty: 0.65, canRepair: false, replaceCost: 100, sourceRarity: "uncommon", prerequisites: ["crx_timing_belt"],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "crx_head_surface_warp", chance: 0.35, flavorText: "Light warping around cylinder 3. Aluminum does this." },
          flavorText: ["Multi-layer steel or composite. Torque in sequence.", "Check for bubbles in the coolant overflow first.", "The D16 is almost always fine. Almost."] },
        { id: "crx_head_surface_warp", name: "Head Surface Warping", repairType: "bodywork", difficulty: 0.5, canRepair: true, replaceCost: 180, sourceRarity: "rare", prerequisites: ["crx_head_gasket"],
          hiddenReveal: null, flavorText: ["0.002 inch is the limit. Check it.", "DOHC head. Machine shop or new head.", "Aluminum warps if it overheated. They all overheated."] },
      ]},
      { id: "eng_accessories", name: "Engine Accessories", parts: [
        { id: "crx_water_pump", name: "Water Pump", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 70, sourceRarity: "common", prerequisites: ["crx_timing_belt"],
          hiddenReveal: null, flavorText: ["Driven by the timing belt. Same job, do them together.", "Weep hole dripping. That's your sign.", "Honda OEM or Gates. Don't cheap out here."] },
        { id: "crx_intake_manifold_gasket", name: "Intake Manifold Gasket", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 25, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Vacuum leak hunting. Spray carb cleaner, listen for RPM change.", "Paper gasket on 30-year-old aluminum. Replace it.", "IACV and fast idle valve while you're at it."] },
        { id: "crx_oil_pan_gasket", name: "Oil Pan Gasket", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 28, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Every driveway it's touched has a stain.", "RTV or OEM gasket. RTV if you can't find one.", "Impact-gun happy PO means stripped threads. Check first."] },
      ]},
    ]},
    { id: "fuel", name: "Fuel System", type: "detailed", subsystems: [
      { id: "fuel_main", name: "Fuel Delivery", parts: [
        { id: "crx_fuel_pump", name: "Fuel Pump", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 85, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["In-tank. Drop the tank or go through the trunk.", "Listen for the prime hum. If you can't hear it, you found the problem.", "Denso or Bosch. Aftermarket pumps and Honda have a complicated relationship."] },
        { id: "crx_fuel_filter", name: "Fuel Filter", repairType: "wrench", difficulty: 0.1, canRepair: false, replaceCost: 15, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Inline filter. Clip style. Easy.", "Check the crush washers on the banjos.", "Rusty exterior, murky interior. Replace it."] },
        { id: "crx_fuel_injectors", name: "Fuel Injectors (×4)", repairType: "precision", difficulty: 0.5, canRepair: true, replaceCost: 120, sourceRarity: "uncommon", prerequisites: ["crx_fuel_filter"],
          hiddenReveal: null, flavorText: ["Denso squirt-type. Ultrasonic clean or replace.", "Ohm them out. 10-13Ω spec.", "New O-rings and filter baskets at minimum."] },
        { id: "crx_fuel_lines", name: "Fuel Lines (rubber sections)", repairType: "wrench", difficulty: 0.25, canRepair: true, replaceCost: 40, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Every rubber section is 30 years old.", "Honda EFI fuel lines aren't always easy to find.", "Fuel-rated hose only. This is not negotiable."] },
      ]},
    ]},
    { id: "cooling", name: "Cooling System", type: "detailed", subsystems: [
      { id: "cooling_main", name: "Cooling Circuit", parts: [
        { id: "crx_radiator", name: "Radiator", repairType: "wrench", difficulty: 0.3, canRepair: true, replaceCost: 130, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Plastic tanks, aluminum core. The tanks crack first.", "Pressure test it. Green stains mean it's been weeping.", "Half the size of a normal car's. Cooling capacity is tight."] },
        { id: "crx_thermostat", name: "Thermostat", repairType: "wrench", difficulty: 0.1, canRepair: false, replaceCost: 12, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["82°C Honda stat. Don't go cooler — VTEC doesn't like it.", "Boil test or just replace. It's $12.", "Housing O-ring too. Don't reuse the old one."] },
        { id: "crx_coolant_hoses", name: "Coolant Hoses (set)", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 50, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Squeeze every one. Soft and mushy = replace.", "The bypass hose is always the hardest to reach.", "OEM Honda hoses last forever. Aftermarket varies."] },
        { id: "crx_rad_cap", name: "Radiator Cap", repairType: "wrench", difficulty: 0.05, canRepair: false, replaceCost: 10, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["0.9 bar. Test it or replace it.", "Honda's cooling system is pressure-sensitive. A bad cap matters.", "Costs nothing. Do it."] },
      ]},
    ]},
    { id: "exhaust", name: "Exhaust System", type: "detailed", subsystems: [
      { id: "exh_main", name: "Exhaust Path", parts: [
        { id: "crx_exhaust_header", name: "Exhaust Header", repairType: "wrench", difficulty: 0.45, canRepair: true, replaceCost: 160, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "crx_header_studs", chance: 0.7, flavorText: "Two studs pulled right out with the header. Aluminum block doesn't forgive." },
          flavorText: ["4-2-1 OEM header. Rusty but solid.", "It's cast iron, not headers. But it flows well.", "Crack check at the collector. They split there."] },
        { id: "crx_header_studs", name: "Broken Header Studs", repairType: "wrench", difficulty: 0.6, canRepair: true, replaceCost: 35, sourceRarity: "common", prerequisites: ["crx_exhaust_header"],
          hiddenReveal: null, flavorText: ["Drill and extract. Patience.", "Heat, penetrant, patience. Then drill.", "This is how a quick job becomes a weekend."] },
        { id: "crx_cat", name: "Catalytic Converter", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 175, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Rattle test. OEM cats on CRXes are collector items somehow.", "Shake it. Loose substrate sounds like maracas.", "Check local laws before deleting. It's a CRX, not a race car."] },
        { id: "crx_muffler", name: "Muffler & Rear Section", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 70, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Rotted at the hanger mounts. Falls off at the worst time.", "Stock is quiet. Too quiet, some say.", "Generic bolt-on fits. Don't overthink it."] },
      ]},
    ]},
    { id: "drivetrain", name: "Drivetrain", type: "detailed", subsystems: [
      { id: "dt_clutch", name: "Clutch Assembly", parts: [
        { id: "crx_clutch_disc", name: "Clutch Disc", repairType: "wrench", difficulty: 0.55, canRepair: false, replaceCost: 95, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Honda cable clutch. Light pedal, but worn to nothing.", "Organic disc. Should last 100k if you don't ride it.", "Transmission out for this one. Budget the time."] },
        { id: "crx_pressure_plate", name: "Pressure Plate", repairType: "precision", difficulty: 0.45, canRepair: false, replaceCost: 80, sourceRarity: "uncommon", prerequisites: ["crx_clutch_disc"],
          hiddenReveal: null, flavorText: ["Torque the bolts in a crossing pattern. Don't skip steps.", "Check for heat cracks on the friction surface.", "Replace as a set with the disc. Every time."] },
        { id: "crx_throwout_bearing", name: "Throw-Out Bearing", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 28, sourceRarity: "common", prerequisites: ["crx_clutch_disc"],
          hiddenReveal: null, flavorText: ["Chirp on release? That's this.", "Replace it. You're already in there.", "Hydraulic on some years, cable on others. Check first."] },
        { id: "crx_shift_cables", name: "Shift Cables", repairType: "wrench", difficulty: 0.35, canRepair: false, replaceCost: 55, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Plastic bushing at the transmission end. They crack.", "Vague, imprecise shifting? Start here.", "Honda OEM or you'll be fighting it forever."] },
      ]},
      { id: "dt_axles", name: "Axle Shafts", parts: [
        { id: "crx_axle_r", name: "Right Axle Shaft", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 90, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "crx_cv_boot_r", chance: 0.6, flavorText: "Inner CV boot is split. Grease everywhere. You'll need to repack the joint." },
          flavorText: ["FWD. Every torque steer story starts here.", "Snap ring at the diff end. Fish it out, it goes back.", "Rebuilt shaft is fine on a street car."] },
        { id: "crx_cv_boot_r", name: "Right Inner CV Boot", repairType: "bodywork", difficulty: 0.2, canRepair: true, replaceCost: 25, sourceRarity: "common", prerequisites: ["crx_axle_r"],
          hiddenReveal: null, flavorText: ["Split boot means the joint ate dirt. Check for play before reassembly.", "Split type boot is easier than disassembly.", "Pack with CV grease. Use the whole tube."] },
        { id: "crx_axle_l", name: "Left Axle Shaft", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 90, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["The longer of the two. Intermediate shaft on some years.", "Click on turns? CV joint toast.", "No vibration doesn't mean it's fine. Check the boots."] },
      ]},
    ]},
    { id: "brakes", name: "Brakes", type: "detailed", subsystems: [
      { id: "brakes_front", name: "Front Brakes", parts: [
        { id: "crx_front_pads", name: "Front Brake Pads", repairType: "wrench", difficulty: 0.15, canRepair: false, replaceCost: 35, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Metal on metal. How long did they ride these?", "Honda single-piston sliding caliper. Simple.", "Bed them in. 10 hard stops from 40mph."] },
        { id: "crx_front_rotors", name: "Front Rotors", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 55, sourceRarity: "common", prerequisites: ["crx_front_pads"],
          hiddenReveal: null, flavorText: ["Measure the thickness. Below 22mm on these, they're done.", "Grooved from the worn pads. Don't turn them, replace.", "Solid rotors. Adequate for a CRX."] },
        { id: "crx_front_caliper", name: "Front Caliper (×2)", repairType: "precision", difficulty: 0.4, canRepair: true, replaceCost: 80, sourceRarity: "uncommon", prerequisites: ["crx_front_pads"],
          hiddenReveal: null, flavorText: ["Slide pins seized. They always seize.", "Rebuild kit or reman. Both work.", "Torque the banjo bolt. Don't forget the crush washer."] },
      ]},
      { id: "brakes_rear", name: "Rear Brakes", parts: [
        { id: "crx_rear_drums", name: "Rear Drum Brakes", repairType: "wrench", difficulty: 0.35, canRepair: true, replaceCost: 50, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Springs, shoes, adjusters, hold-down pins. It's a puzzle.", "Drums on a sports car. Very 1991.", "Adjust until the drag is just right."] },
        { id: "crx_brake_lines", name: "Brake Lines", repairType: "wrench", difficulty: 0.35, canRepair: false, replaceCost: 65, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Rubber flex lines swell internally. You won't see it until they fail.", "Steel lines surface rust. Replace rubber sections minimum.", "Bleed every corner after. DOT4."] },
        { id: "crx_master_cylinder", name: "Brake Master Cylinder", repairType: "precision", difficulty: 0.45, canRepair: false, replaceCost: 85, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Pedal goes to the floor? Internal bypass.", "Bench bleed before install. Non-negotiable.", "Honda master cylinders last a long time. Until they don't."] },
      ]},
    ]},
    { id: "suspension", name: "Suspension", type: "detailed", subsystems: [
      { id: "susp_front", name: "Front Suspension", parts: [
        { id: "crx_front_struts", name: "Front Struts", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 150, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["MacPherson struts. The spring compressor is mandatory.", "Blown. Bouncy and vague.", "KYB or Tokico. Skip the cheap stuff on a car this light."] },
        { id: "crx_ball_joints", name: "Ball Joints (×2)", repairType: "wrench", difficulty: 0.35, canRepair: false, replaceCost: 65, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Shake the wheel at 12 and 6. Any play means replace.", "Press job. Rent the tool.", "Boot torn = joint shot. No exceptions."] },
        { id: "crx_tie_rod_ends", name: "Tie Rod Ends", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 40, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Grab at 3 and 9. Slop = replace.", "Count the turns off the old ones. Rough alignment setting.", "Get an alignment after. Obviously."] },
        { id: "crx_front_sway_links", name: "Front Sway Bar Links", repairType: "wrench", difficulty: 0.15, canRepair: false, replaceCost: 20, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Clunk over bumps? These.", "Ball joints at both ends. One might be loose.", "Best dollar-per-handling-improvement on the car."] },
      ]},
      { id: "susp_rear", name: "Rear Suspension", parts: [
        { id: "crx_rear_shocks", name: "Rear Shocks", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 110, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Torsion beam rear. Two shocks.", "Blown. Bouncy on expansion strips.", "KYB GR2 or Excel-G. Either works."] },
        { id: "crx_rear_trailing_bushings", name: "Rear Trailing Arm Bushings", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 50, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Cracked rubber. They all crack.", "Press job. Or torch the old ones out.", "Affects rear alignment geometry. Don't skip."] },
      ]},
    ]},
    { id: "interior",   name: "Interior",          type: "bundle", repairType: "bodywork", difficulty: 0.3, bundleCost: 350, gridSize: [3,5],
      flavorText: ["Cracked dash, torn seat bolsters, mystery smell that might be mold. Honda's 1991 interior aesthetic was spartan at best.", "The previous owner put a Momo wheel on. It looks fine. The hub adaptor does not."] },
    { id: "electrical", name: "Electrical",         type: "bundle", repairType: "diagnosis", difficulty: 0.35, bundleCost: 300, gridSize: [2,3],
      flavorText: ["OBD0 Honda. No codes, just symptoms. The check engine light means everything or nothing.", "Someone added an aftermarket alarm with spliced wires. Good luck."] },
    { id: "body",       name: "Body & Panels",      type: "bundle", repairType: "bodywork", difficulty: 0.7, bundleCost: 850, gridSize: [3,5],
      flavorText: ["Rocker panel cancer. Rear quarter rust. The CRX's real weakness was thin metal over the rear wheels.", "The fenders are original. The rockers are not long for this world. Sand carefully."] },
    { id: "glass",      name: "Glass",              type: "bundle", repairType: "bodywork", difficulty: 0.2, bundleCost: 220, gridSize: [2,3],
      flavorText: ["Windshield has a crack in the lower driver corner. Pop-ups are hazed to near-useless.", "JDM glass fits. Domestic glass fits too. Different opinion on it in forums."] },
    { id: "trim",       name: "Trim & Weatherstrip", type: "bundle", repairType: "bodywork", difficulty: 0.15, bundleCost: 140, gridSize: [2,3],
      flavorText: ["Every rubber seal is 30 years old. The CRX is drafty at highway speed.", "The Spoon sticker on the bumper is not OEM."] },
  ],
  diagnosticScenarios: [
    { id: "crx_diag_misfire", systemId: "engine", symptom: "Rough idle and stumble under light throttle. Worse when cold, improves when hot.",
      clues: { free: ["Spark plugs are fouled — black and sooty.", "Intake boot cracked, visible at the throttle body."],
               multimeter: "Primary coil resistance inside spec. Secondary coil at the distributor: 12.4kΩ (spec 10-16kΩ). OK." },
      correctDiagnosis: "crx_intake_manifold_gasket", wrongOptions: ["crx_spark_plugs", "crx_fuel_injectors", "crx_distributor"],
      multiLayer: null },
    { id: "crx_diag_overheat", systemId: "cooling", symptom: "Temp gauge spikes to red in traffic. Fan kicks on but car still overheats.",
      clues: { free: ["Coolant level is fine. No leaks.", "Lower radiator hose stays cool while upper is hot."],
               compressionTester: "Compression normal across all 4 cylinders." },
      correctDiagnosis: "crx_thermostat", wrongOptions: ["crx_radiator", "crx_water_pump", "crx_coolant_hoses"],
      multiLayer: null },
    { id: "crx_diag_clutch_slip", systemId: "drivetrain", symptom: "RPMs flare during hard acceleration but the car doesn't accelerate proportionally.",
      clues: { free: ["Clutch engages very high on the pedal travel.", "Burning smell during aggressive driving."],
               multimeter: "Not applicable." },
      correctDiagnosis: "crx_clutch_disc", wrongOptions: ["crx_pressure_plate", "crx_shift_cables", "crx_throwout_bearing"],
      multiLayer: null },
    { id: "crx_diag_brake_pull", systemId: "brakes", symptom: "Car pulls hard to the right under braking. Steering wheel tugs.",
      clues: { free: ["Right front caliper is hot to touch after a short drive.", "Left front pad has minimal wear. Right front is almost gone."],
               multimeter: "Not applicable." },
      correctDiagnosis: "crx_front_caliper", wrongOptions: ["crx_front_pads", "crx_brake_lines", "crx_master_cylinder"],
      multiLayer: null },
  ],
};

// ══════════════════════════════════════════════════════════════
//  S13 PART TREE — ★★★★ Rare (drift tax, mystery wiring, undoing bad mods)
// ══════════════════════════════════════════════════════════════
GD.PART_TREES.s13 = {
  modelId: "s13", displayName: "1993 Nissan 240SX", chassisCode: "S13", engineCode: "KA24DE", rarity: 4,
  arrivalConditionRange: [0.10, 0.35],
  firstStartText: "KA fires up. 2400cc of reliable torque, idling at a steady 900 RPM. Whoever owned this before couldn't kill it. You've fixed what they broke.",
  loreBlurb: "The platform that taught a generation how to drift. Bought cheap, abused hard, loved deeply. Undoing the damage is the whole point.",
  systems: [
    { id: "engine", name: "Engine (KA24DE)", type: "detailed", subsystems: [
      { id: "eng_top", name: "Cylinder Head", parts: [
        { id: "s13_valve_cover_gasket", name: "Valve Cover Gasket", repairType: "wrench", difficulty: 0.25, canRepair: true, replaceCost: 28, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["DOHC KA. Two cam seals too.", "Oil weep down the back of the block. Classic KA.", "Clean the mating surface before RTV. Seriously, clean it."] },
        { id: "s13_spark_plugs", name: "Spark Plugs (×4)", repairType: "precision", difficulty: 0.2, canRepair: false, replaceCost: 40, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["NGK BKR6E. Gap to 0.044\".", "Long-reach plugs. Torque to spec — don't overtighten in aluminum.", "Previous owner used iridiums. They're also toast."] },
        { id: "s13_cam_seals", name: "Cam Seals (×2)", repairType: "precision", difficulty: 0.4, canRepair: false, replaceCost: 30, sourceRarity: "common", prerequisites: ["s13_valve_cover_gasket"],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "s13_cam_cap_bolts", chance: 0.4, flavorText: "Two cam cap bolts are stripped. Previous owner over-tightened. They do this every time." },
          flavorText: ["Rear main of the top end. They seep after 100k.", "Clean the bore before installing.", "Lip seal, not o-ring. Direction matters."] },
        { id: "s13_cam_cap_bolts", name: "Stripped Cam Cap Bolts", repairType: "wrench", difficulty: 0.5, canRepair: true, replaceCost: 20, sourceRarity: "common", prerequisites: ["s13_cam_seals"],
          hiddenReveal: null, flavorText: ["Helicoil time.", "Previous owner had an impact gun and no torque wrench.", "M6×1.0. Thread repair is straightforward on aluminum."] },
        { id: "s13_timing_chain_guides", name: "Timing Chain Guides", repairType: "wrench", difficulty: 0.6, canRepair: false, replaceCost: 75, sourceRarity: "uncommon", prerequisites: ["s13_valve_cover_gasket"],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "s13_timing_chain_tensioner", chance: 0.75, flavorText: "Tensioner is at full extension. The chain has stretched. Budget for the whole service." },
          flavorText: ["Rattle on startup = worn guides or stretched chain.", "Not cheap. Not optional.", "KA timing chain goes 200k if you change oil. Neglect it and it doesn't."] },
        { id: "s13_timing_chain_tensioner", name: "Timing Chain Tensioner", repairType: "precision", difficulty: 0.45, canRepair: false, replaceCost: 65, sourceRarity: "uncommon", prerequisites: ["s13_timing_chain_guides"],
          hiddenReveal: null, flavorText: ["Hydraulic tensioner. Prime it before install.", "If the chain's stretched, replace it too.", "Rattle gone? Job's done right."] },
      ]},
      { id: "eng_bottom", name: "Short Block Accessories", parts: [
        { id: "s13_intake_manifold_gasket", name: "Intake Manifold Gasket", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 30, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Vacuum leak here = lean stumble.", "Paper gasket. They all crack eventually.", "IACV gasket while you're at it."] },
        { id: "s13_oil_pan_gasket", name: "Oil Pan Gasket", repairType: "wrench", difficulty: 0.35, canRepair: false, replaceCost: 32, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Every S13 has an oil stain in someone's driveway.", "Cork or OEM rubber. RTV if desperate.", "14 pan bolts. Torque in a crossing pattern."] },
        { id: "s13_engine_mounts", name: "Engine Mounts (×2)", repairType: "wrench", difficulty: 0.5, canRepair: false, replaceCost: 90, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Drift tax #1. Violent transitions shred stock mounts.", "Rubber center torn or missing entirely.", "Polyurethane is fine for street/track. NVH goes up."] },
        { id: "s13_vtc_solenoid", name: "VTC Solenoid", repairType: "diagnosis", difficulty: 0.45, canRepair: false, replaceCost: 80, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Variable timing. Rattle on startup? Start here.", "Ohm test: 6-9Ω at cold. Clean the screen first.", "Junkyard part is risky. Nissan OEM or nothing."] },
        { id: "s13_coil_packs", name: "Ignition Coil Packs (×2)", repairType: "precision", difficulty: 0.3, canRepair: false, replaceCost: 70, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Wasted spark. Two coils, four cylinders.", "Primary: 0.6-0.8Ω. Secondary: 10-15kΩ.", "Cracks in the towers cause misfires at high RPM."] },
      ]},
    ]},
    { id: "fuel", name: "Fuel System", type: "detailed", subsystems: [
      { id: "fuel_main", name: "Fuel Delivery", parts: [
        { id: "s13_fuel_pump", name: "Fuel Pump", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 90, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["In-tank. Access via carpet hatch in the trunk.", "Drift tax: fuel starvation kills pumps.", "Walbro 255 is the standard upgrade. OEM is fine for stock."] },
        { id: "s13_fuel_filter", name: "Fuel Filter", repairType: "wrench", difficulty: 0.1, canRepair: false, replaceCost: 18, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Inline. Banjo bolts with crush washers.", "Brown fuel? This is why.", "Replace it every 30k. No one does."] },
        { id: "s13_fuel_injectors", name: "Fuel Injectors (×4)", repairType: "precision", difficulty: 0.5, canRepair: true, replaceCost: 130, sourceRarity: "uncommon", prerequisites: ["s13_fuel_filter"],
          hiddenReveal: null, flavorText: ["OEM 370cc Nissan injectors. Adequate for stock KA.", "Ultrasonically clean and flow-test first.", "Someone may have installed 550cc without tuning. Check the size."] },
        { id: "s13_fuel_pressure_reg", name: "Fuel Pressure Regulator", repairType: "diagnosis", difficulty: 0.4, canRepair: false, replaceCost: 70, sourceRarity: "uncommon", prerequisites: ["s13_fuel_filter"],
          hiddenReveal: null, flavorText: ["Vacuum referenced. Check the line to the intake manifold.", "Fuel smell in vacuum line = diaphragm torn.", "Factory spec: 43 PSI at idle."] },
        { id: "s13_fuel_lines", name: "Fuel Lines", repairType: "wrench", difficulty: 0.3, canRepair: true, replaceCost: 50, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Previous owner may have 'upgraded' with AN fittings. Check the connections.", "Hard lines are fine. Every rubber section, replace.", "Fuel smell under hard cornering? Line routing issue."] },
      ]},
    ]},
    { id: "cooling", name: "Cooling System", type: "detailed", subsystems: [
      { id: "cooling_main", name: "Cooling Circuit", parts: [
        { id: "s13_radiator", name: "Radiator", repairType: "wrench", difficulty: 0.35, canRepair: true, replaceCost: 145, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Someone ran it dry at some point. Pressure test first.", "Aluminum aftermarket is 40% more capacity. Worth it.", "OEM plastic tanks crack around the fittings."] },
        { id: "s13_thermostat", name: "Thermostat", repairType: "wrench", difficulty: 0.1, canRepair: false, replaceCost: 14, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["82°C. Don't run without one.", "Nissan stat housing is fragile. Hand-tight then 1/4 turn.", "Override thermostat = rich fueling, fouled plugs."] },
        { id: "s13_coolant_hoses", name: "Coolant Hoses", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 55, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Squeeze test every one.", "The heater hoses run through a maze. Give yourself time.", "Silicone upgrade looks great and outlasts the car."] },
        { id: "s13_water_pump", name: "Water Pump", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 75, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Belt-driven, not chain.", "Weep hole at the bottom of the housing. That's your leak indicator.", "Separate timing chain job. This isn't a 'while you're in there'."] },
        { id: "s13_coolant_temp_sensor", name: "Coolant Temp Sensor (ECU)", repairType: "diagnosis", difficulty: 0.3, canRepair: false, replaceCost: 35, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Two sensors: ECU and gauge. Different part, different problem.", "High resistance = cold signal = rich running.", "Common on high-mileage KAs. Just replace it."] },
      ]},
    ]},
    { id: "exhaust", name: "Exhaust System", type: "detailed", subsystems: [
      { id: "exh_main", name: "Exhaust Path", parts: [
        { id: "s13_exhaust_manifold", name: "Exhaust Manifold", repairType: "wrench", difficulty: 0.5, canRepair: true, replaceCost: 185, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "s13_manifold_studs", chance: 0.85, flavorText: "Three studs snapped clean off. Classic KA. Get the stud extractor kit out." },
          flavorText: ["Cast iron log manifold. Cracks at the collectors eventually.", "Previous owner may have 'headers'. Inspect the welds.", "Check for blown gasket between runners."] },
        { id: "s13_manifold_studs", name: "Broken Manifold Studs (×3)", repairType: "wrench", difficulty: 0.7, canRepair: true, replaceCost: 30, sourceRarity: "common", prerequisites: ["s13_exhaust_manifold"],
          hiddenReveal: null, flavorText: ["Heat-soak, impact-gun, repeat. The S13 rite of passage.", "Left-hand drill bits are your friend here.", "Three broken studs minimum. Budget for five."] },
        { id: "s13_cat", name: "Catalytic Converter", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 190, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Check local emissions laws.", "Rattle = broken substrate. Don't run it.", "High-flow cat is a real upgrade if you tune for it."] },
        { id: "s13_flex_pipe", name: "Flex Section", repairType: "wrench", difficulty: 0.35, canRepair: false, replaceCost: 60, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Cracks from fatigue and drift abuse. Exhaust leak at the flex.", "Weld-in repair is $20 at any exhaust shop.", "Replace it and be done."] },
        { id: "s13_muffler", name: "Muffler & Piping", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 80, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Whatever was on it before, it's probably rusted off.", "2.5\" piping. Don't go bigger than 3\" without tuning.", "Borla, Tomei, or generic — all work."] },
      ]},
    ]},
    { id: "drivetrain", name: "Drivetrain", type: "detailed", subsystems: [
      { id: "dt_clutch", name: "Clutch Assembly", parts: [
        { id: "s13_clutch_disc", name: "Clutch Disc", repairType: "wrench", difficulty: 0.55, canRepair: false, replaceCost: 105, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Drift tax #2. Clutch kicks destroy stock discs.", "Hub springs gone. Clunk in drivetrain.", "Exedy or ACT. Not the cheapest stuff on eBay."] },
        { id: "s13_pressure_plate", name: "Pressure Plate", repairType: "precision", difficulty: 0.5, canRepair: false, replaceCost: 90, sourceRarity: "uncommon", prerequisites: ["s13_clutch_disc"],
          hiddenReveal: null, flavorText: ["Finger height variation means pressure plate is done.", "Replace as a set. You're already there.", "Match to the disc: sprung vs unsprung hub."] },
        { id: "s13_flywheel", name: "Flywheel", repairType: "precision", difficulty: 0.5, canRepair: true, replaceCost: 130, sourceRarity: "uncommon", prerequisites: ["s13_clutch_disc"],
          hiddenReveal: null, flavorText: ["Heat cracks? Resurface or replace.", "Lightened flywheel changes the character of the car completely.", "Check the ring gear. Starter problems might be this."] },
        { id: "s13_throwout_bearing", name: "Throw-Out Bearing", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 30, sourceRarity: "common", prerequisites: ["s13_clutch_disc"],
          hiddenReveal: null, flavorText: ["Chirp on clutch release. That sound.", "Replace it every clutch job.", "Hydraulic release bearing. Bleed after install."] },
      ]},
      { id: "dt_driveline", name: "Driveline", parts: [
        { id: "s13_driveshaft", name: "Driveshaft", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 120, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "s13_center_bearing", chance: 0.6, flavorText: "Center support bearing is shot. You can feel the slop in the two-piece shaft." },
          flavorText: ["Two-piece with a center support bearing.", "Vibration at speed? Could be the shaft or the center bearing.", "Balance is critical. Have it checked."] },
        { id: "s13_center_bearing", name: "Driveshaft Center Bearing", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 45, sourceRarity: "common", prerequisites: ["s13_driveshaft"],
          hiddenReveal: null, flavorText: ["Rubber mount hardened and cracked.", "Common failure on high-mileage S13s.", "Easy fix once you've got the shaft out."] },
        { id: "s13_rear_diff_oil", name: "Rear Differential Fluid", repairType: "wrench", difficulty: 0.15, canRepair: true, replaceCost: 25, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Drain it. If it smells burnt and has chunks, bigger problems.", "GL-5 80W-90. Torsen or open diff — same fluid.", "Someone ran it dry at a drift event. You can tell."] },
        { id: "s13_rear_diff_seals", name: "Rear Diff Pinion & Axle Seals", repairType: "precision", difficulty: 0.45, canRepair: false, replaceCost: 55, sourceRarity: "uncommon", prerequisites: ["s13_rear_diff_oil"],
          hiddenReveal: null, flavorText: ["Diff oil on the brakes means these are done.", "Pinion seal is a press job.", "Check for play in the pinion before installing new seals."] },
        { id: "s13_axle_shafts", name: "Rear Axle Shafts (×2)", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 110, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "s13_cv_joints", chance: 0.5, flavorText: "One CV joint has notchy movement through its range. Repack or replace." },
          flavorText: ["Drift tax #3. Snapped axles are a badge of honor apparently.", "CV-style axle shafts. Check the boots.", "OEM or Nismo. Don't go cheap on something that snaps under power."] },
        { id: "s13_cv_joints", name: "Rear CV Joint (×1)", repairType: "precision", difficulty: 0.5, canRepair: true, replaceCost: 85, sourceRarity: "uncommon", prerequisites: ["s13_axle_shafts"],
          hiddenReveal: null, flavorText: ["Disassemble, clean, inspect balls and cage.", "Repack with proper CV grease if not pitted.", "Notchy = replace the joint."] },
      ]},
    ]},
    { id: "brakes", name: "Brakes", type: "detailed", subsystems: [
      { id: "brakes_front", name: "Front Brakes", parts: [
        { id: "s13_front_pads", name: "Front Brake Pads", repairType: "wrench", difficulty: 0.15, canRepair: false, replaceCost: 40, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Metal on metal. Again.", "Drift-taxed brakes. Thermal cycling kills pads.", "Hawk HPS minimum. Stock pads fade on track."] },
        { id: "s13_front_rotors", name: "Front Rotors", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 65, sourceRarity: "common", prerequisites: ["s13_front_pads"],
          hiddenReveal: null, flavorText: ["Heat cracks in the face. Not remachineable.", "Warped from aggressive cooling. Replace.", "Slotted or drilled optional. Blanks are fine for street."] },
        { id: "s13_front_calipers", name: "Front Calipers (×2)", repairType: "precision", difficulty: 0.4, canRepair: true, replaceCost: 90, sourceRarity: "uncommon", prerequisites: ["s13_front_pads"],
          hiddenReveal: null, flavorText: ["Seized slides. Every S13.", "Rebuild kits are cheap. Reman calipers are better.", "Brake cleaner, silicon grease on the slides only."] },
      ]},
      { id: "brakes_rear", name: "Rear Brakes", parts: [
        { id: "s13_rear_pads", name: "Rear Brake Pads", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 38, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Rear disc on the S13. One of its charms.", "Hand brake shoes are separate. Don't forget them.", "Drift wear pattern — inside edge gone, outside edge fine."] },
        { id: "s13_rear_rotors", name: "Rear Rotors", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 60, sourceRarity: "common", prerequisites: ["s13_rear_pads"],
          hiddenReveal: null, flavorText: ["Rust lipping on the inner hat. Remove it before measurement.", "Minimum thickness is 8mm. These are at 8.5mm.", "Replace them."] },
        { id: "s13_rear_calipers", name: "Rear Calipers (×2)", repairType: "precision", difficulty: 0.35, canRepair: true, replaceCost: 80, sourceRarity: "uncommon", prerequisites: ["s13_rear_pads"],
          hiddenReveal: null, flavorText: ["E-brake mechanism inside. Check it actuates.", "Seized pistons. Wind the piston in, don't push.", "The parking brake pawl wears. Common rebuild issue."] },
        { id: "s13_brake_lines", name: "Brake Lines", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 70, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["30-year-old rubber. Don't trust it.", "Stainless braided upgrade is worth it if you're tracking it.", "Bleed every corner. Minimum 200ml per caliper."] },
        { id: "s13_master_cylinder", name: "Brake Master Cylinder", repairType: "precision", difficulty: 0.5, canRepair: false, replaceCost: 95, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Long pedal travel or slow return = this.", "Bench bleed before install. You know this.", "Check the reservoir cap seal too."] },
        { id: "s13_abs_sensors", name: "ABS Wheel Speed Sensors (×4)", repairType: "diagnosis", difficulty: 0.45, canRepair: false, replaceCost: 120, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["ABS light on? Could be sensor, could be wiring, could be tone ring.", "Ohm test: 900-2000Ω across the terminals.", "Many S13s have ABS deleted. Check before diagnosing."] },
      ]},
    ]},
    { id: "suspension", name: "Suspension", type: "detailed", subsystems: [
      { id: "susp_front", name: "Front Suspension", parts: [
        { id: "s13_front_coilovers", name: "Front Struts / Coilovers", repairType: "wrench", difficulty: 0.5, canRepair: false, replaceCost: 200, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Previous owner put coilovers on. May or may not be set up properly.", "If OEM struts: blown and done. BC Racing is the entry-level standard.", "Spring perch threads: check for corrosion."] },
        { id: "s13_front_knuckle", name: "Front Steering Knuckle (×2)", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 130, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Drift angle kits replace these entirely. Check what's on the car.", "Bent knuckle = tram-lining and weird tire wear.", "OEM or aftermarket drift knuckle — know which is there."] },
        { id: "s13_front_lower_arm", name: "Front Lower Control Arms (×2)", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 110, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Drift tax #4. Hard curb hits bend these.", "Aftermarket tension rods change the geometry.", "Inspect the front-to-rear bolt holes for elongation."] },
        { id: "s13_front_upper_arm", name: "Front Upper Arms (×2)", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 100, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["OEM are stamped steel. After they're bent, they're garbage.", "Aftermarket adjustable uppers fix caster.", "Ball joint wear is the key failure point."] },
        { id: "s13_wheel_bearings_f", name: "Front Wheel Bearings (×2)", repairType: "precision", difficulty: 0.5, canRepair: false, replaceCost: 85, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Grab the wheel top and bottom. Any play?", "Drone at highway speed that changes with steering input.", "Press job. Invest in the right tool."] },
        { id: "s13_tie_rods", name: "Tie Rod Ends (×2)", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 45, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Check for play. Drift toe arms replace these sometimes.", "Inner tie rod if the outer is fine. Check both.", "Get an alignment after."] },
        { id: "s13_front_sway_links", name: "Front Sway Bar End Links", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 25, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Clunk over bumps.", "Worn ball joints at both ends.", "Cheap and effective."] },
      ]},
      { id: "susp_rear", name: "Rear Suspension", parts: [
        { id: "s13_rear_lower_arms", name: "Rear Lower Control Arms (×2)", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 120, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Multi-link rear. Four control arm positions.", "Bent from curbing. Check with a tape measure.", "Aftermarket adjustable for proper alignment setup."] },
        { id: "s13_rear_upper_arms", name: "Rear Upper Arms (×2)", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 105, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Camber adjustment is here.", "Bushing wear shows up as rear toe change under load.", "Nismo or MOOG. Either is fine."] },
        { id: "s13_rear_toe_arms", name: "Rear Toe Control Arms (×2)", repairType: "precision", difficulty: 0.4, canRepair: false, replaceCost: 95, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Bent toe arm = car that won't track straight.", "Adjustable aftermarket changes the car's character.", "Measure before deciding."] },
        { id: "s13_rear_subframe_bushings", name: "Rear Subframe Bushings", repairType: "wrench", difficulty: 0.55, canRepair: false, replaceCost: 80, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Vague rear end? Could be this.", "Hydraulic bushings. Can't rebuild them, just replace.", "Poly inserts exist. More feedback, more NVH."] },
        { id: "s13_steering_rack", name: "Power Steering Rack", repairType: "precision", difficulty: 0.6, canRepair: true, replaceCost: 180, sourceRarity: "rare", prerequisites: [],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "s13_rack_inner_tierods", chance: 0.55, flavorText: "Inner tie rods have notchy movement. They'll need replacing with the rack seal kit." },
          flavorText: ["Leaking rack end seal. Classic.", "Manual rack swap is popular. Completely changes steering feel.", "Rebuild kit exists. Or just find a straight used rack."] },
        { id: "s13_rack_inner_tierods", name: "Steering Rack Inner Tie Rods", repairType: "wrench", difficulty: 0.35, canRepair: false, replaceCost: 50, sourceRarity: "uncommon", prerequisites: ["s13_steering_rack"],
          hiddenReveal: null, flavorText: ["Notchy through center. Classic inner tie rod.", "The boot keeps them alive. Once the boot goes, the joint follows.", "Replace both sides while you're in there."] },
      ]},
    ]},
    { id: "interior",   name: "Interior",          type: "bundle", repairType: "bodywork", difficulty: 0.45, bundleCost: 500, gridSize: [3,5],
      flavorText: ["Previous owner removed the rear seats for 'weight reduction'. Mystery wiring harnesses go nowhere. The smell of energy drinks is permanent.", "Bride knockoff seat is bolted in with a generic rail. The stock seat was already here somewhere."] },
    { id: "electrical", name: "Electrical",         type: "bundle", repairType: "diagnosis", difficulty: 0.55, bundleCost: 420, gridSize: [2,3],
      flavorText: ["Mystery ignition kill switch, cut wires to the AC, and an amplifier wired direct to battery with no fuse. This is a drift car electrical.", "The previous owner's stereo wiring is a rats nest. Three different wire colors for ground."] },
    { id: "body",       name: "Body & Panels",      type: "bundle", repairType: "bodywork", difficulty: 0.6, bundleCost: 700, gridSize: [3,5],
      flavorText: ["Quarter panel dents, scuffed door sills, and what might be overspray from a rattle-can touch-up. The Kouki front end is rough but repairable.", "Rear bumper has a crack. The fenders have been rolled for clearance. This car lived a life."] },
    { id: "glass",      name: "Glass",              type: "bundle", repairType: "bodywork", difficulty: 0.2, bundleCost: 230, gridSize: [2,3],
      flavorText: ["Windshield stone chips. The rear window defroster works, somehow.", "Side windows operate. The passenger window goes down but is slow to come up."] },
    { id: "trim",       name: "Trim & Weatherstrip", type: "bundle", repairType: "bodywork", difficulty: 0.2, bundleCost: 160, gridSize: [2,3],
      flavorText: ["Wind noise at highway speed. Every weatherstrip is compressed flat.", "The door sill trim is broken on the driver's side. The S13 door card clips are brittle at this age."] },
  ],
  diagnosticScenarios: [
    { id: "s13_diag_timing", systemId: "engine", symptom: "Startup rattle that goes away after 30 seconds. Worse when oil is cold.",
      clues: { free: ["Rattle comes from the front of the engine, driver's side.", "Oil pressure light off. Oil level is fine."],
               multimeter: "Ohm test on VTC solenoid: 4.2Ω (spec: 6-9Ω). Low — possible open circuit.",
               compressionTester: "Compression: #1: 170psi, #2: 172psi, #3: 169psi, #4: 171psi. All strong." },
      correctDiagnosis: "s13_timing_chain_guides", wrongOptions: ["s13_vtc_solenoid", "s13_engine_mounts", "s13_cam_seals"],
      multiLayer: null },
    { id: "s13_diag_fuel_lean", systemId: "fuel", symptom: "Engine stumbles at WOT above 4000 RPM. Fine at part throttle.",
      clues: { free: ["Plugs are lean — white and clean.", "Car has an aftermarket induction kit."],
               multimeter: "Fuel pump voltage at the connector: 12.1V. Fine." },
      correctDiagnosis: "s13_fuel_pressure_reg", wrongOptions: ["s13_fuel_pump", "s13_fuel_injectors", "s13_coolant_temp_sensor"],
      multiLayer: null },
    { id: "s13_diag_rear_clunk", systemId: "suspension", symptom: "Clunk from the rear under deceleration and direction changes.",
      clues: { free: ["Clunk is worse on bumpy roads.", "Rear end feels vague and imprecise."],
               multimeter: "Not applicable." },
      correctDiagnosis: "s13_rear_subframe_bushings", wrongOptions: ["s13_rear_lower_arms", "s13_center_bearing", "s13_rear_diff_seals"],
      multiLayer: null },
    { id: "s13_diag_misfire_idle", systemId: "engine", symptom: "Rough idle and CEL. Occasional stumble when pulling away from stops.",
      clues: { free: ["Cylinder 3 plug is oil-fouled.", "Oil on the valve cover mating surface."],
               compressionTester: "Compression: #1: 168psi, #2: 170psi, #3: 130psi, #4: 171psi. #3 is low." },
      correctDiagnosis: "s13_cam_seals", wrongOptions: ["s13_spark_plugs", "s13_coil_packs", "s13_intake_manifold_gasket"],
      multiLayer: { revealsScenarioId: "s13_diag_timing" } },
  ],
};

// ══════════════════════════════════════════════════════════════
//  FC3S PART TREE — ★★★★ Rare (first rotary, single turbo, port cleanup)
// ══════════════════════════════════════════════════════════════
GD.PART_TREES.fc3s = {
  modelId: "fc3s", displayName: "1989 Mazda RX-7 FC3S", chassisCode: "FC3S", engineCode: "13B-T", rarity: 4,
  arrivalConditionRange: [0.10, 0.35],
  firstStartText: "The 13B catches and rises to 1800 RPM before settling. The rotary idle is unlike anything else — a smooth, mechanical hum with a hint of oil smoke on the first start. It clears. She runs.",
  loreBlurb: "The gateway rotary. Learn the engine's quirks here before you ever touch an FD. Every apex seal you replace is tuition.",
  systems: [
    { id: "engine", name: "Engine (13B-T)", type: "detailed", subsystems: [
      { id: "rotor_front", name: "Front Rotor Housing", parts: [
        { id: "fc_apex_seals_f", name: "Front Apex Seals (×3)", repairType: "precision", difficulty: 0.85, canRepair: false, replaceCost: 280, sourceRarity: "rare", prerequisites: [],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "fc_rotor_scoring_f", chance: 0.55, flavorText: "Scoring on the front rotor face — the seal wore into the epitrochoidal surface. Inspect carefully." },
          flavorText: ["Three-piece per rotor. The rotary's Achilles heel.", "If they're scored, the housing needs replacing. There's no cheap fix.", "Measure the spring height. Under 1.5mm free length = replace the springs too."] },
        { id: "fc_rotor_scoring_f", name: "Front Rotor Face Scoring", repairType: "bodywork", difficulty: 0.65, canRepair: true, replaceCost: 350, sourceRarity: "rare", prerequisites: ["fc_apex_seals_f"],
          hiddenReveal: null, flavorText: ["Light scoring can be lapped. Deep grooves require housing replacement.", "Degree of scoring determines if this is a cleanup or a rebuild.", "Get out the calipers. Measure housing depth at the worn areas."] },
        { id: "fc_side_seals_f", name: "Front Side Seals (×4)", repairType: "precision", difficulty: 0.7, canRepair: false, replaceCost: 120, sourceRarity: "uncommon", prerequisites: ["fc_apex_seals_f"],
          hiddenReveal: null, flavorText: ["Two per rotor face. Easy to miss.", "Side seal spring tension matters. Check each one.", "Oil leaks into the combustion chamber here."] },
        { id: "fc_corner_seals_f", name: "Front Corner Seals", repairType: "precision", difficulty: 0.6, canRepair: false, replaceCost: 90, sourceRarity: "uncommon", prerequisites: ["fc_side_seals_f"],
          hiddenReveal: null, flavorText: ["Where the apex and side seals meet. Critical sealing point.", "O-ring under each one. Don't reuse them.", "Easy to drop these in the housing on reassembly. Use grease to hold them."] },
      ]},
      { id: "rotor_rear", name: "Rear Rotor Housing", parts: [
        { id: "fc_apex_seals_r", name: "Rear Apex Seals (×3)", repairType: "precision", difficulty: 0.85, canRepair: false, replaceCost: 280, sourceRarity: "rare", prerequisites: [],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "fc_rotor_scoring_r", chance: 0.5, flavorText: "Rear rotor shows scoring. Not as bad as the front, but still present." },
          flavorText: ["Rear rotor runs hotter than the front. These often go first.", "Same spec as front seals. Replace both sets.", "Check the rotor itself for heat cracks near the oil holes."] },
        { id: "fc_rotor_scoring_r", name: "Rear Rotor Face Scoring", repairType: "bodywork", difficulty: 0.65, canRepair: true, replaceCost: 350, sourceRarity: "rare", prerequisites: ["fc_apex_seals_r"],
          hiddenReveal: null, flavorText: ["Usually less severe than front. Sometimes worse.", "Same repair approach as front — lap or replace.", "If both rotors are scored, you're doing a full rebuild."] },
        { id: "fc_side_seals_r", name: "Rear Side Seals (×4)", repairType: "precision", difficulty: 0.7, canRepair: false, replaceCost: 120, sourceRarity: "uncommon", prerequisites: ["fc_apex_seals_r"],
          hiddenReveal: null, flavorText: ["Replace with the apex seals. Always.", "Check spring tension on each one.", "Don't mix front and rear during disassembly."] },
      ]},
      { id: "engine_core", name: "Core Assembly", parts: [
        { id: "fc_coolant_seals", name: "Coolant Seals (×8)", repairType: "precision", difficulty: 0.75, canRepair: false, replaceCost: 160, sourceRarity: "rare", prerequisites: [],
          hiddenReveal: null, flavorText: ["The rotary's other Achilles heel. Coolant into the combustion chamber is catastrophic.", "O-ring and rubber seal. Each side of each rotor housing.", "White smoke + sweet smell = these have failed."] },
        { id: "fc_oil_seals", name: "Oil Control Seals", repairType: "precision", difficulty: 0.6, canRepair: false, replaceCost: 95, sourceRarity: "uncommon", prerequisites: ["fc_coolant_seals"],
          hiddenReveal: null, flavorText: ["Blue smoke on deceleration — oil getting past these.", "The rotary uses oil intentionally for lubrication. Too much means these are done.", "Replace every seal kit item. There are no optional seals."] },
        { id: "fc_eccentric_shaft", name: "Eccentric Shaft & Bearings", repairType: "precision", difficulty: 0.7, canRepair: false, replaceCost: 280, sourceRarity: "rare", prerequisites: [],
          hiddenReveal: null, flavorText: ["The rotary's crankshaft equivalent. Measure the journal clearances.", "End play spec is 0.002-0.006\". Check it.", "If the journals are scored, this is a machine-shop job."] },
        { id: "fc_metering_oil_pump", name: "Metering Oil Pump", repairType: "diagnosis", difficulty: 0.5, canRepair: false, replaceCost: 150, sourceRarity: "rare", prerequisites: [],
          hiddenReveal: null, flavorText: ["Injects oil into the intake charge for rotor lubrication.", "Failure = excessive wear on seals and housings.", "Check the pump output. The factory service manual has a flow test."] },
        { id: "fc_front_cover", name: "Front Cover & Seals", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 80, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Oil leak from the snout. Front seal gone.", "Remove to access the timing chain and distributor drive.", "O-ring on the coolant passages. Replace while you're there."] },
        { id: "fc_rear_cover", name: "Rear Cover", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 75, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Houses the rear main oil seal.", "Oil at the bell housing = this seal, or the transmission input.", "Torque the bolts in sequence. Even torque, no warping."] },
      ]},
    ]},
    { id: "forced_induction", name: "Forced Induction", type: "detailed", subsystems: [
      { id: "turbo_main", name: "Turbo System", parts: [
        { id: "fc_turbo_cartridge", name: "Turbo Cartridge", repairType: "diagnosis", difficulty: 0.7, canRepair: true, replaceCost: 450, sourceRarity: "rare", prerequisites: [],
          hiddenReveal: null, flavorText: ["Shaft play: axial up to 0.06mm, radial up to 0.12mm is acceptable.", "Oil contamination in the compressor housing means the seals are gone.", "Rebuild if play is within spec. Replace if the shaft is scored."] },
        { id: "fc_turbo_inlet", name: "Turbo Inlet Pipe & Air Cleaner", repairType: "wrench", difficulty: 0.3, canRepair: true, replaceCost: 65, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Intake pipe cracks where it flexes near the turbo.", "Previous owner may have swapped an aftermarket intake. Verify fit.", "Oil in the intake = turbo seals. Clean it all out."] },
        { id: "fc_turbo_outlet", name: "Turbo Outlet & Hose", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 55, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Hot pipe from turbo to intercooler. Cracks from heat cycling.", "Boost leak here = lag and no power.", "Check every clamp."] },
        { id: "fc_wastegate", name: "Wastegate Actuator", repairType: "diagnosis", difficulty: 0.5, canRepair: false, replaceCost: 120, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Pressure test the diaphragm. If it leaks, boost will overrun.", "Factory boost is 9 PSI. More than that = actuator done or adjusted.", "Wastegate arm wear causes flutter and inconsistent boost."] },
        { id: "fc_bov", name: "Blow-Off Valve", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 80, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Diverter valve on stock cars. Vents to atmosphere on aftermarket.", "Chattering on decel? The valve spring is weak.", "Recirculating is better for the MAF sensor. Don't vent to atmosphere."] },
      ]},
      { id: "intercooler", name: "Intercooler System", parts: [
        { id: "fc_ic_core", name: "Intercooler Core", repairType: "bodywork", difficulty: 0.35, canRepair: true, replaceCost: 200, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Fin damage on the front face. Park-lot wars.", "Pressure test it. Leaking end tanks are common.", "Upgraded intercooler is worth it if boost is being raised."] },
        { id: "fc_ic_piping", name: "Intercooler Piping Set", repairType: "wrench", difficulty: 0.35, canRepair: true, replaceCost: 90, sourceRarity: "uncommon", prerequisites: ["fc_ic_core"],
          hiddenReveal: null, flavorText: ["Every coupler hose on this car is original. Every one is suspicious.", "Cracks at the bends. Aluminum hard pipes crack at the welds.", "Silicone couplers and new clamps. While you're here."] },
        { id: "fc_boost_solenoid", name: "Boost Control Solenoid", repairType: "diagnosis", difficulty: 0.4, canRepair: false, replaceCost: 85, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["PWM solenoid for boost control. Ohm test: 20-40Ω.", "Sticking solenoid = inconsistent boost pressure.", "Clean it first. Replace if cleaning doesn't fix it."] },
      ]},
    ]},
    { id: "fuel", name: "Fuel System", type: "detailed", subsystems: [
      { id: "fuel_main", name: "Fuel Delivery", parts: [
        { id: "fc_fuel_pump", name: "Fuel Pump", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 90, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["In-tank. Access under the carpet in the hatchback.", "Rotaries are thirsty. A weak pump starves the engine.", "Walbro 255 is the upgrade standard."] },
        { id: "fc_injectors_primary", name: "Primary Fuel Injectors (×2)", repairType: "precision", difficulty: 0.55, canRepair: true, replaceCost: 130, sourceRarity: "uncommon", prerequisites: ["fc_fuel_pump"],
          hiddenReveal: null, flavorText: ["Two primary injectors for low-speed fueling.", "Clean and flow-test. Replace if more than 10% variation.", "The rotary's sequential injection system is unique. Understand it."] },
        { id: "fc_injectors_secondary", name: "Secondary Fuel Injectors (×2)", repairType: "precision", difficulty: 0.55, canRepair: true, replaceCost: 130, sourceRarity: "uncommon", prerequisites: ["fc_injectors_primary"],
          hiddenReveal: null, flavorText: ["Open under boost. If they're stuck closed, top-end power disappears.", "Clogged secondaries cause lean stumble at high RPM.", "Flow-test both sets at the same time."] },
        { id: "fc_fuel_filter", name: "Fuel Filter", repairType: "wrench", difficulty: 0.1, canRepair: false, replaceCost: 18, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Inline, easy access.", "Change it first. Rule out the simple stuff.", "Brown fuel runs through 30 years of injector history."] },
      ]},
    ]},
    { id: "cooling", name: "Cooling System", type: "detailed", subsystems: [
      { id: "cooling_main", name: "Cooling Circuit", parts: [
        { id: "fc_radiator", name: "Radiator", repairType: "wrench", difficulty: 0.4, canRepair: true, replaceCost: 160, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["The 13B runs hot. Radiator capacity matters more than on a piston engine.", "Pressure test before anything. Rotaries boil over silently.", "Aluminium 2-row upgrade is the move."] },
        { id: "fc_thermostat", name: "Thermostat", repairType: "wrench", difficulty: 0.15, canRepair: false, replaceCost: 14, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["82°C stat. Do not run without one.", "Rotary coolant temp is critical for seal longevity.", "Always replace with a quality part."] },
        { id: "fc_coolant_hoses", name: "Coolant Hoses (full set)", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 60, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["More coolant passages than a piston engine. Count the hoses before you order.", "The 13B's cooling is complex. Every hose matters.", "Silicone upgrade is worth every dollar."] },
        { id: "fc_water_pump", name: "Water Pump", repairType: "wrench", difficulty: 0.5, canRepair: false, replaceCost: 90, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Belt driven. Separate belt from the alternator.", "If the rotary overheats from a pump failure, the rebuild bill is measured in thousands.", "Replace every service if you have any doubts."] },
        { id: "fc_oil_cooler", name: "Engine Oil Cooler", repairType: "wrench", difficulty: 0.35, canRepair: false, replaceCost: 120, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["The 13B uses oil as a secondary coolant for the rotor housings.", "Clogged cooler = hot oil = short engine life.", "Flush with clean oil after replacement."] },
      ]},
    ]},
    { id: "exhaust", name: "Exhaust System", type: "detailed", subsystems: [
      { id: "exh_main", name: "Exhaust Path", parts: [
        { id: "fc_exhaust_manifold", name: "Exhaust Manifold / Turbo Flange", repairType: "wrench", difficulty: 0.55, canRepair: true, replaceCost: 220, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: { revealsOnAction: "remove", targetPartId: "fc_manifold_gasket", chance: 0.7, flavorText: "Manifold gasket is blown at the flange. Standard FC maintenance item." },
          flavorText: ["Integral turbo manifold on most years.", "Cracks at the collector under sustained boost.", "Check the turbo flange face. Warped flange = boost leak."] },
        { id: "fc_manifold_gasket", name: "Exhaust Manifold Gasket", repairType: "precision", difficulty: 0.4, canRepair: false, replaceCost: 45, sourceRarity: "common", prerequisites: ["fc_exhaust_manifold"],
          hiddenReveal: null, flavorText: ["Multi-layer steel on the turbo flange. Torque to spec.", "Blown gasket sounds like a ticking exhaust leak.", "Check the mounting surface for warping before fitting a new one."] },
        { id: "fc_downpipe", name: "Downpipe", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 150, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["The downpipe runs close to the steering rack. Heat shielding is important.", "Previous owner may have a 3\" turbo-back. Check diameter.", "Flex section in the downpipe. Inspect it."] },
        { id: "fc_cat", name: "Catalytic Converter", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 200, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["High-flow or OEM. Depends on your emissions situation.", "Rotary cats run hot and need to be robust.", "Rattle = broken substrate. Engine damage risk."] },
        { id: "fc_muffler", name: "Muffler & Rear Pipe", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 90, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["FC exhaust is fairly quiet stock. Good or bad depending on who you ask.", "Previous owner may have added a louder can.", "3\" cat-back is the common upgrade."] },
      ]},
    ]},
    { id: "drivetrain", name: "Drivetrain", type: "detailed", subsystems: [
      { id: "dt_clutch", name: "Clutch Assembly", parts: [
        { id: "fc_clutch_disc", name: "Clutch Disc", repairType: "wrench", difficulty: 0.6, canRepair: false, replaceCost: 110, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Rotary torque is smooth but constant. Clutch discs don't like it long-term.", "Organic disc is fine for street. Sprung hub dampens drivetrain harmonics.", "Check the flywheel surface at the same time."] },
        { id: "fc_pressure_plate", name: "Pressure Plate", repairType: "precision", difficulty: 0.55, canRepair: false, replaceCost: 95, sourceRarity: "uncommon", prerequisites: ["fc_clutch_disc"],
          hiddenReveal: null, flavorText: ["Replace as a set. Every time.", "Torque the bolts evenly — six of them, crossing pattern.", "Check for finger height variation."] },
        { id: "fc_flywheel", name: "Flywheel", repairType: "precision", difficulty: 0.5, canRepair: true, replaceCost: 140, sourceRarity: "uncommon", prerequisites: ["fc_clutch_disc"],
          hiddenReveal: null, flavorText: ["Heat cracks from slipping. Machine or replace.", "The 13B's broad powerband makes a lightened flywheel worthwhile.", "Ring gear condition — starter hits the same teeth each time."] },
        { id: "fc_throwout_bearing", name: "Throw-Out Bearing", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 32, sourceRarity: "common", prerequisites: ["fc_clutch_disc"],
          hiddenReveal: null, flavorText: ["Chirp on release. You know the sound.", "Replace it. You're there.", "Hydraulic release on the R154 trans."] },
      ]},
      { id: "dt_driveline", name: "Driveline", parts: [
        { id: "fc_driveshaft", name: "Propeller Shaft (2-piece)", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 130, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Center bearing. They all fail eventually.", "Vibration at 55-65mph that goes away above 70 = center bearing.", "Have it balanced after any suspension height change."] },
        { id: "fc_rear_diff", name: "Rear Differential", repairType: "wrench", difficulty: 0.5, canRepair: true, replaceCost: 200, sourceRarity: "rare", prerequisites: [],
          hiddenReveal: null, flavorText: ["Open diff on most FCs. Torsen optional.", "Drain the fluid. If it smells burnt, internal wear is present.", "Diff whine on decel = bearing wear."] },
        { id: "fc_rear_axles", name: "Rear Axle Shafts (×2)", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 100, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Solid rear axle. Simple.", "Check the inner seal where the shaft enters the diff housing.", "Half-shaft click = CV joint. Semi-float axle — just replace it."] },
        { id: "fc_transmission_mounts", name: "Transmission & PPF Mounts", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 100, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["The PPF (Power Plant Frame) is unique to Mazda rotaries.", "Torn mounts cause clunking under power transitions.", "Poly or OEM replacement. Poly adds NVH, reduces flex."] },
      ]},
    ]},
    { id: "brakes", name: "Brakes", type: "detailed", subsystems: [
      { id: "brakes_front", name: "Front Brakes", parts: [
        { id: "fc_front_pads", name: "Front Brake Pads", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 42, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Stock single-piston caliper. More than adequate.", "The rotary doesn't engine brake much. Brakes do all the work.", "Hawk HPS for track days."] },
        { id: "fc_front_rotors", name: "Front Rotors", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 70, sourceRarity: "common", prerequisites: ["fc_front_pads"],
          hiddenReveal: null, flavorText: ["Measure thickness. Grooved from worn pads.", "Thermal cracks from track use.", "Slotted or blanks. Neither is wrong."] },
        { id: "fc_front_calipers", name: "Front Calipers (×2)", repairType: "precision", difficulty: 0.4, canRepair: true, replaceCost: 90, sourceRarity: "uncommon", prerequisites: ["fc_front_pads"],
          hiddenReveal: null, flavorText: ["Slide pins. Always seized.", "Rebuild kit is cheap. Reman is better.", "Bleed after. Properly."] },
      ]},
      { id: "brakes_rear", name: "Rear Brakes", parts: [
        { id: "fc_rear_pads", name: "Rear Brake Pads", repairType: "wrench", difficulty: 0.2, canRepair: false, replaceCost: 40, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Disc rear on the FC. Nice.", "Worn evenly is good. Worn on the inside only means a stuck caliper.", "Bed them in after replacement."] },
        { id: "fc_rear_rotors", name: "Rear Rotors", repairType: "wrench", difficulty: 0.25, canRepair: false, replaceCost: 65, sourceRarity: "common", prerequisites: ["fc_rear_pads"],
          hiddenReveal: null, flavorText: ["Rust hat from sitting. Wire wheel, then check the measurement.", "Minimum 8mm. These are close.", "Replace if in doubt."] },
        { id: "fc_brake_lines", name: "Brake Lines", repairType: "wrench", difficulty: 0.35, canRepair: false, replaceCost: 68, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["35-year-old rubber. The answer is always yes, replace them.", "Stainless braided if you track it.", "Bleed every corner after. DOT4."] },
        { id: "fc_master_cylinder", name: "Brake Master Cylinder", repairType: "precision", difficulty: 0.45, canRepair: false, replaceCost: 90, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Long travel before pressure build = this.", "Bench bleed before install. Last reminder.", "Mazda brake systems are otherwise fairly conventional."] },
      ]},
    ]},
    { id: "suspension", name: "Suspension", type: "detailed", subsystems: [
      { id: "susp_front", name: "Front Suspension", parts: [
        { id: "fc_front_struts", name: "Front Struts", repairType: "wrench", difficulty: 0.5, canRepair: false, replaceCost: 170, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["MacPherson. Spring compressors. Be safe.", "Stock suspension is soft. Tein or KYB as upgrades.", "Strut top bearing is separate. Check it."] },
        { id: "fc_front_ball_joints", name: "Front Ball Joints (×2)", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 75, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Shake at 12 and 6. Any play, replace.", "Press fit. Rent the press.", "Check while you're replacing struts."] },
        { id: "fc_tie_rods", name: "Tie Rod Ends (×2)", repairType: "wrench", difficulty: 0.3, canRepair: false, replaceCost: 45, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Count the turns off the old one.", "Grab at 3 and 9. Play = replace.", "Alignment after."] },
        { id: "fc_front_sway_links", name: "Front Sway Bar End Links", repairType: "wrench", difficulty: 0.15, canRepair: false, replaceCost: 22, sourceRarity: "common", prerequisites: [],
          hiddenReveal: null, flavorText: ["Clunk over speed bumps. These.", "Ball at each end. One is usually the culprit.", "Replace both. They're cheap."] },
        { id: "fc_front_lower_arms", name: "Front Lower Control Arms (×2)", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 110, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Bushing wear affects caster. Gets vague.", "OEM arms with aftermarket bushings is a good compromise.", "Inspect for cracks, especially near the ball joint mount."] },
      ]},
      { id: "susp_rear", name: "Rear Suspension", parts: [
        { id: "fc_rear_lower_arms", name: "Rear Lower Arms (×2)", repairType: "wrench", difficulty: 0.45, canRepair: false, replaceCost: 120, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Multi-link rear. The FC's best feature vs the NA predecessor.", "Bushing wear shows as rear toe wander.", "OEM or aftermarket adjustable."] },
        { id: "fc_rear_upper_arms", name: "Rear Upper Arms (×2)", repairType: "wrench", difficulty: 0.4, canRepair: false, replaceCost: 105, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Camber adjustment is here on the FC.", "Cracks at the bushing mount — inspect closely.", "Aftermarket adjustable arms for alignment correction."] },
        { id: "fc_rear_toe_arms", name: "Rear Toe Control Arms (×2)", repairType: "precision", difficulty: 0.4, canRepair: false, replaceCost: 95, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Bent = wandering rear end.", "Adjustable aftermarket changes toe behavior under load.", "Measure twice, order once."] },
        { id: "fc_rear_wheel_bearings", name: "Rear Wheel Bearings (×2)", repairType: "precision", difficulty: 0.5, canRepair: false, replaceCost: 90, sourceRarity: "uncommon", prerequisites: [],
          hiddenReveal: null, flavorText: ["Drone at highway speed. Changes with load.", "Press fit. Hire a shop or invest in the right tool.", "Replace in pairs."] },
      ]},
    ]},
    { id: "interior",       name: "Interior",           type: "bundle", repairType: "bodywork", difficulty: 0.4, bundleCost: 480, gridSize: [3,5],
      flavorText: ["Pop-up seats, faded red velour, and a cracked dash. The FC interior smells like it has stories. Some of them are good.", "The shift knob is from a different Mazda. The steering wheel is aftermarket and doesn't quite center. It has charm."] },
    { id: "electrical",     name: "Electrical",          type: "bundle", repairType: "diagnosis", difficulty: 0.5, bundleCost: 380, gridSize: [2,3],
      flavorText: ["The FC's electrical system is complex by 1989 standards — turbo control, climate control, sequential fuel injection. The gremlins know every weakness.", "Air-to-air temperature sensor, boost solenoid wiring, sequential injection switching — diagnose carefully."] },
    { id: "body",           name: "Body & Panels",       type: "bundle", repairType: "bodywork", difficulty: 0.5, bundleCost: 650, gridSize: [3,5],
      flavorText: ["The FC's lines are clean and minimal. The rust is in the usual Japanese sports car spots — rear arches and door bottoms. Fixable but present.", "Previous owner's amateur body filler repair on the passenger quarter. The DA polisher will find it."] },
    { id: "glass",          name: "Glass",               type: "bundle", repairType: "bodywork", difficulty: 0.2, bundleCost: 240, gridSize: [2,3],
      flavorText: ["Pop-up headlight lenses are yellowed. The windshield has an old rock chip in the driver's lower sightline.", "FC glass is getting scarce. Handle it carefully."] },
    { id: "trim",           name: "Trim & Weatherstrip", type: "bundle", repairType: "bodywork", difficulty: 0.15, bundleCost: 155, gridSize: [2,3],
      flavorText: ["T-top weatherstripping is hard to find and the source of every interior water leak.", "The FC's trim pieces are specific and increasingly unobtainium. Preserve what's there."] },
  ],
  diagnosticScenarios: [
    { id: "fc_diag_apex_seals", systemId: "engine", symptom: "Cold start smoke, low compression on one chamber, and a burning-sweet smell at idle.",
      clues: { free: ["Blue-grey smoke clears after 5 minutes of warm-up.", "One rotor shows lower compression than expected."],
               compressionTester: "Compression test (choke open, 6 seconds): Front leading: 7.5psi, Front trailing: 8.0psi, Rear leading: 10.5psi, Rear trailing: 11.0psi. Front rotor is significantly low." },
      correctDiagnosis: "fc_apex_seals_f", wrongOptions: ["fc_coolant_seals", "fc_oil_seals", "fc_metering_oil_pump"],
      multiLayer: null },
    { id: "fc_diag_coolant_seal", systemId: "cooling", symptom: "White steam from the exhaust. Coolant level drops. Engine does not overheat.",
      clues: { free: ["Coolant is disappearing but there are no visible external leaks.", "Exhaust has a sweet smell under hard acceleration."],
               compressionTester: "Compression normal. No combustion gases in the coolant reservoir." },
      correctDiagnosis: "fc_coolant_seals", wrongOptions: ["fc_radiator", "fc_water_pump", "fc_coolant_hoses"],
      multiLayer: null },
    { id: "fc_diag_boost", systemId: "forced_induction", symptom: "Boost pressure doesn't build above 5 PSI. Power feels like a naturally aspirated car.",
      clues: { free: ["No visible boost leaks in the piping.", "Wastegate rod has full travel available."],
               multimeter: "Boost solenoid resistance: 85Ω (spec 20-40Ω). Out of range.",
               boostLeakTester: "Pressure test holds at 12 PSI. No leaks detected in piping." },
      correctDiagnosis: "fc_boost_solenoid", wrongOptions: ["fc_wastegate", "fc_ic_piping", "fc_turbo_cartridge"],
      multiLayer: null },
    { id: "fc_diag_turbo_worn", systemId: "forced_induction", symptom: "Black smoke under boost, oil consumption, and slight turbo shaft play.",
      clues: { free: ["Oil in the intake piping after the turbo.", "Boost builds but drops off at high RPM."],
               multimeter: "Not applicable — mechanical inspection required.",
               boostLeakTester: "Pressure test fine. Piping holds. Problem is the turbo itself." },
      correctDiagnosis: "fc_turbo_cartridge", wrongOptions: ["fc_boost_solenoid", "fc_oil_seals", "fc_fuel_pump"],
      multiLayer: null },
    { id: "fc_diag_oil_leak", systemId: "engine", symptom: "Oil weeping from the front of the engine. Burning oil smell after warmup.",
      clues: { free: ["Fresh oil trail from behind the harmonic balancer.", "Oil level drops slowly over time."],
               multimeter: "Not applicable." },
      correctDiagnosis: "fc_front_cover", wrongOptions: ["fc_rear_cover", "fc_oil_seals", "fc_coolant_seals"],
      multiLayer: null },
  ],
};



// ── ELECTRICAL DIAGNOSTIC SCENARIOS (shared bundle type, systemId: "electrical") ──

GD.ELECTRICAL_SCENARIOS = {
  ae86: [
    { id: "ae86_diag_no_spark", systemId: "electrical",
      symptom: "Engine cranks but won't start. No spark at the plugs when tested.",
      clues: { free: ["Distributor cap looks clean and dry. No visible issues.", "The car was running fine yesterday. No warning."],
               multimeter: "Ignition coil primary resistance: open circuit (spec: 1.3-1.6Ω). Coil has failed." },
      correctDiagnosis: "ae86_distributor_cap", wrongOptions: ["ae86_spark_plugs", "ae86_timing_belt", "ae86_alt_belt"],
      multiLayer: null },
    { id: "ae86_diag_charging", systemId: "electrical",
      symptom: "Battery light on. Voltmeter reads 11.8V at idle. Battery is new.",
      clues: { free: ["Belt is intact and not slipping.", "Voltage at the battery terminals: 12.1V with engine running (spec: 13.5-14.5V)."],
               multimeter: "Alternator output connector: 0V at the B+ terminal with engine running. Not charging at all." },
      correctDiagnosis: "ae86_alt_belt", wrongOptions: ["ae86_distributor_cap", "ae86_timing_belt", "ae86_valve_cover_gasket"],
      multiLayer: null },
  ],
  crx: [
    { id: "crx_diag_idle_hunt", systemId: "electrical",
      symptom: "Rough idle that hunts up and down between 500 and 1200 RPM. Worse when cold.",
      clues: { free: ["IACV hose is cracked near the throttle body.", "Intake manifold gasket looks original and possibly weeping."],
               multimeter: "IACV coil resistance: 9.8Ω at cold (spec: 10-15Ω). Borderline." },
      correctDiagnosis: "crx_distributor", wrongOptions: ["crx_spark_plugs", "crx_intake_manifold_gasket", "crx_fuel_injectors"],
      multiLayer: null },
    { id: "crx_diag_no_start_warm", systemId: "electrical",
      symptom: "Car starts fine cold, but after reaching operating temp it won't restart for 20-30 minutes.",
      clues: { free: ["Fuel pressure holds. Injectors click.", "Spark is weak — visibly blue-yellow instead of sharp blue-white."],
               multimeter: "Main relay resistance: 12Ω hot (spec: 80-90Ω at 20°C, drops to 30Ω hot). Failing." },
      correctDiagnosis: "crx_fuel_pump", wrongOptions: ["crx_distributor", "crx_spark_plugs", "crx_coolant_hoses"],
      multiLayer: null },
  ],
  s13: [
    { id: "s13_diag_vtc_rattle", systemId: "engine",
      symptom: "Metallic rattle from the front of the engine on cold startup. Disappears after 10-15 seconds.",
      clues: { free: ["Rattle is rhythmic, from the passenger side cam area.", "Oil level is correct and clean."],
               multimeter: "VTC solenoid resistance: 3.8Ω (spec: 6-9Ω). Below spec — solenoid is drawing too much current." },
      correctDiagnosis: "s13_vtc_solenoid", wrongOptions: ["s13_timing_chain_guides", "s13_cam_seals", "s13_engine_mounts"],
      multiLayer: null },
    { id: "s13_diag_electrical_gremlin", systemId: "electrical",
      symptom: "Intermittent no-start. Sometimes cranks fine, sometimes nothing. No pattern.",
      clues: { free: ["Battery and starter test out fine.", "Someone cut and spliced the main harness near the fuse box. Several wires."],
               multimeter: "Voltage drop across chassis ground: 1.2V (spec: under 0.1V). Bad ground somewhere in the rat's nest." },
      correctDiagnosis: "s13_abs_sensors", wrongOptions: ["s13_coil_packs", "s13_vtc_solenoid", "s13_coolant_temp_sensor"],
      multiLayer: null },
    { id: "s13_diag_coolant_sensor", systemId: "cooling",
      symptom: "Rich running when cold, slow warm-up on the gauge, but temp feels normal to the touch.",
      clues: { free: ["No coolant leaks. Thermostat was just replaced.", "Gauge reads normal range once fully warm."],
               multimeter: "ECU coolant temp sensor resistance cold (20°C): 3.8kΩ (spec: 2.1-2.9kΩ). Reading falsely cold." },
      correctDiagnosis: "s13_coolant_temp_sensor", wrongOptions: ["s13_thermostat", "s13_radiator", "s13_water_pump"],
      multiLayer: null },
    { id: "s13_diag_abs", systemId: "brakes",
      symptom: "ABS light stays on after startup. ABS doesn't function during a hard stop test.",
      clues: { free: ["Rear left wheel sensor connector is corroded — visible green patina.", "No other warning lights on the dash."],
               multimeter: "Rear left ABS sensor resistance: open circuit (spec: 900-2000Ω). Sensor is dead." },
      correctDiagnosis: "s13_abs_sensors", wrongOptions: ["s13_rear_calipers", "s13_rear_pads", "s13_master_cylinder"],
      multiLayer: null },
  ],
  fc3s: [
    { id: "fc_diag_metering_pump", systemId: "engine",
      symptom: "Excessive oil smoke on startup and under acceleration. Oil consumption is notably high.",
      clues: { free: ["Apex seals tested recently and are within spec.", "Oil level drops 1 quart per 500 miles."],
               multimeter: "Metering oil pump output: 0.8ml/min at idle (spec: 1.2-1.8ml/min). Under-delivering." },
      correctDiagnosis: "fc_metering_oil_pump", wrongOptions: ["fc_apex_seals_f", "fc_oil_seals", "fc_rear_cover"],
      multiLayer: null },
    { id: "fc_diag_wastegate", systemId: "forced_induction",
      symptom: "Boost overshoots to 14 PSI then drops to 7 PSI and fluctuates. The solenoid and piping tested fine.",
      clues: { free: ["Boost solenoid tests within spec. Piping holds pressure.", "Wastegate arm shows significant slop when wiggled by hand."],
               multimeter: "Not applicable — mechanical inspection only.",
               boostLeakTester: "All piping holds 12 PSI for 60 seconds. Boost circuit is sealed." },
      correctDiagnosis: "fc_wastegate", wrongOptions: ["fc_boost_solenoid", "fc_turbo_cartridge", "fc_ic_piping"],
      multiLayer: null },
    { id: "fc_diag_electrical", systemId: "electrical",
      symptom: "Check engine light on. Boost control erratic. Climate control stopped working.",
      clues: { free: ["Multiple systems failing simultaneously. Common power or ground issue likely.", "Previous owner's amplifier is wired directly to the battery with no fuse."],
               multimeter: "Main ECU ground resistance: 4.2Ω (spec: under 0.5Ω). Corroded chassis ground at the firewall." },
      correctDiagnosis: "fc_boost_solenoid", wrongOptions: ["fc_wastegate", "fc_turbo_cartridge", "fc_metering_oil_pump"],
      multiLayer: null },
  ],
};

// Merge electrical and extra scenarios into each vehicle's diagnosticScenarios array
// Called at runtime after all trees are defined
(function mergeScenarios() {
  const eScen = GD.ELECTRICAL_SCENARIOS;
  if (GD.PART_TREES.ae86) GD.PART_TREES.ae86.diagnosticScenarios.push(...eScen.ae86);
  if (GD.PART_TREES.crx)  GD.PART_TREES.crx.diagnosticScenarios.push(...eScen.crx);
  if (GD.PART_TREES.s13)  {
    GD.PART_TREES.s13.diagnosticScenarios.push(
      eScen.s13.find(s => s.id === "s13_diag_vtc_rattle"),
      eScen.s13.find(s => s.id === "s13_diag_electrical_gremlin"),
      eScen.s13.find(s => s.id === "s13_diag_coolant_sensor"),
      eScen.s13.find(s => s.id === "s13_diag_abs"),
    );
  }
  if (GD.PART_TREES.fc3s) GD.PART_TREES.fc3s.diagnosticScenarios.push(...eScen.fc3s);
})();


// Export to window
window.GD = GD;
})();
