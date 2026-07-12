"""
Our Safe Policy
Layer 0 — Hard deny list (pure Python, runs before the domain gate)
Layer 1 — Domain Gate (pure Python, no LLM calls)
"""
import re as _re_deny

APPROVED_DOMAINS = {
    # Mathematics
    "mathematics", "math", "calculus", "algebra", "geometry", "topology",
    "number theory", "statistics", "probability", "linear algebra",
    "differential equations", "trigonometry", "discrete mathematics",
    "fractals", "set theory", "combinatorics", "graph theory", "logic",
    # Mathematics — research-level vocabulary
    "riemann", "euler", "fourier", "laplace", "hilbert", "banach",
    "manifold", "eigenvalue", "eigenvector", "tensor", "gradient",
    "divergence", "curl", "integral", "derivative", "theorem", "proof",
    "conjecture", "hypothesis", "lemma", "corollary", "prime", "modular",
    "galois", "abelian", "polynomial", "stochastic", "markov", "matrix",
    "vector space", "homomorphism", "isomorphism", "lattice", "metric",
    "norm", "measure theory", "functional analysis", "complex analysis",
    "real analysis", "number field", "ring", "group theory", "category",
    "p vs np", "millennium prize",

    # Physics
    "physics", "mechanics", "thermodynamics", "electromagnetism",
    "quantum mechanics", "quantum physics", "relativity", "optics",
    "acoustics", "nuclear physics", "astrophysics", "fluid dynamics",
    "wave mechanics", "particle physics", "classical mechanics",
    "quantum field theory", "condensed matter", "plasma physics",
    # Physics — research-level vocabulary
    "yang-mills", "yang mills", "schrödinger", "schrodinger", "heisenberg",
    "feynman", "lagrangian", "hamiltonian", "entropy", "entanglement",
    "superposition", "wavefunction", "wave function", "boson", "fermion",
    "quark", "lepton", "photon", "graviton", "higgs", "dark matter",
    "dark energy", "cosmology", "black hole", "neutron star",
    "string theory", "supersymmetry", "renormalization", "gauge theory",
    "perturbation theory", "path integral", "partition function",
    "phase transition", "critical point", "magnetism", "superconductivity",
    "semiconductor", "solid state", "lattice dynamics", "phonon",
    "spin", "angular momentum", "orbital", "spectra", "wavelength",
    "frequency", "energy level", "band gap", "scattering",

    # Chemistry
    "chemistry", "organic chemistry", "inorganic chemistry",
    "physical chemistry", "electrochemistry", "thermochemistry",
    "crystallography", "molecular structure", "chemical bonding",
    "reaction kinetics", "stoichiometry", "periodic table",
    "spectroscopy", "quantum chemistry", "polymer chemistry",
    # Chemistry — research-level vocabulary
    "catalyst", "catalysis", "oxidation", "reduction", "redox",
    "titration", "equilibrium", "enthalpy", "gibbs", "helmholtz",
    "bond energy", "hybridization", "aromaticity", "chirality",
    "stereochemistry", "isomer", "functional group", "reagent",
    "synthesis", "reaction mechanism", "transition state", "activation",
    "solubility", "ph", "acid", "base", "buffer", "electrode",
    "electrolysis", "galvanic", "nernst", "molecular orbital",

    # Computer Science
    "computer science", "programming", "algorithms", "data structures",
    "machine learning", "artificial intelligence", "neural networks",
    "cryptography", "operating systems", "databases", "networking",
    "software engineering", "compilers", "automata theory",
    "complexity theory", "computer architecture", "data science",
    "computer graphics", "distributed systems", "cybersecurity",
    # Computer Science — research-level vocabulary
    "turing", "np-hard", "np-complete", "polynomial time", "big-o",
    "recursion", "dynamic programming", "greedy algorithm", "sorting",
    "hashing", "binary tree", "graph traversal", "bfs", "dfs",
    "optimization", "gradient descent", "backpropagation", "transformer",
    "attention mechanism", "convolutional", "recurrent", "lstm", "gpt",
    "reinforcement learning", "bayesian", "markov chain", "monte carlo",
    "formal verification", "type theory", "lambda calculus", "semantics",
    "concurrency", "parallelism", "distributed computing", "blockchain",
    "zero knowledge", "homomorphic encryption", "rsa", "elliptic curve",
    "information theory", "kolmogorov", "shannon", "entropy",
    "computability", "halting problem", "reduction", "oracle",
}

# Layer 2 — Hardcoded negative prompt (built into FireworksImageTool)
# Never configurable by agents; always appended to every image request.
ISLAMIC_NEGATIVE_PROMPT = (
    "humans, people, faces, eyes, mouth, hands, limbs, body parts, "
    "animals, birds, insects, fish, creatures, living beings, anatomy, "
    "skin, fur, feathers, realistic figures, cartoon characters, "
    "portraits, silhouettes, shadows of people or animals, dolls, "
    "anthropomorphic shapes, organic creatures, biological forms"
)

# ---------------------------------------------------------------------------
# Layer 0 — Hard deny list
# These patterns block requests unconditionally before any domain check or
# LLM call.  The list covers: illegal drug synthesis, weapons, explosives,
# malware/hacking instructions, and self-harm content.
# ---------------------------------------------------------------------------
_DENY_PATTERNS: list[_re_deny.Pattern[str]] = [
    # Drugs / illegal narcotics
    _re_deny.compile(
        r'\b(cocaine|heroin|methamphetamine|meth|fentanyl|crack\s+cocaine'
        r'|mdma|ecstasy|lsd|crystal\s+meth|opium|morphine\s+synthesis'
        r'|drug\s+synthesis|illicit\s+drug|narcotic\s+synthesis)\b',
        _re_deny.IGNORECASE,
    ),
    # Explosives / weapons
    _re_deny.compile(
        r'\b(make\s+(a\s+)?(bomb|explosive|grenade|landmine|ied)'
        r'|build\s+(a\s+)?(bomb|weapon|gun|rifle|pistol)'
        r'|synthesize\s+(vx|sarin|novichok|mustard\s+gas|nerve\s+agent|chemical\s+weapon)'
        r'|plastic\s+explosive|thermite|ammonium\s+nitrate\s+bomb)\b',
        _re_deny.IGNORECASE,
    ),
    # Hacking / malware
    _re_deny.compile(
        r'\b(create\s+(a\s+)?(virus|malware|ransomware|trojan|keylogger|rootkit)'
        r'|write\s+(a\s+)?(virus|malware|exploit|shellcode)'
        r'|how\s+to\s+hack\s+(into\s+)?(a\s+)?(computer|server|network|account)'
        r'|sql\s+injection\s+attack|ddos\s+attack\s+tool)\b',
        _re_deny.IGNORECASE,
    ),
    # Self-harm
    _re_deny.compile(
        r'\b(how\s+to\s+(commit\s+suicide|kill\s+(myself|yourself)'
        r'|self[- ]harm|cut\s+myself))\b',
        _re_deny.IGNORECASE,
    ),
]

_DENY_MESSAGE = (
    "That request cannot be processed. "
    "Maerefa Online covers Mathematics, Physics, Chemistry, and Computer Science "
    "for educational purposes only."
)


def check_deny_list(prompt: str) -> tuple[bool, str | None]:
    """
    Returns (True, reason) if the prompt matches a hard-deny pattern.
    Returns (False, None) if it is clean.
    Runs before check_domain — no LLM call needed.
    """
    for pattern in _DENY_PATTERNS:
        if pattern.search(prompt):
            return True, _DENY_MESSAGE
    return False, None


OUT_OF_SCOPE = {
    "biology": (
        "Maerefa Online focuses on Mathematics, Physics, Chemistry, and Computer Science. "
        "Try asking about chemistry or physics instead!"
    ),
    "history": (
        "Maerefa Online is a STEM platform. "
        "Try exploring algorithms, quantum mechanics, or calculus!"
    ),
    "default": (
        "That topic is outside our STEM focus. "
        "Please ask about Mathematics, Physics, Chemistry, or Computer Science."
    ),
}

DOMAIN_VISUAL_STYLE = {
    "mathematics": "sacred geometry, golden ratio spirals, fractal Mandelbrot set, tessellations, infinite tiling patterns",
    "physics": "electromagnetic field lines, wave interference patterns, crystalline lattice structures, spectral light dispersion",
    "chemistry": "molecular orbital diagrams, crystallographic unit cells, periodic pattern arrangements, atomic orbital clouds",
    "computer science": "binary tree fractals, circuit board geometric patterns, data flow abstract art, neural network node diagrams",
}


# Arabic STEM keywords (subset of approved domains) for Layer-1 domain gate
_ARABIC_STEM_KEYWORDS = {
    # Mathematics
    "رياضيات", "رياضة", "حساب", "جبر", "هندسة", "إحصاء", "احصاء",
    "احتمال", "مصفوفة", "تفاضل", "تكامل", "معادلة", "مثلثات",
    "توبولوجيا", "طوبولوجيا", "كسورية", "نظرية الأعداد", "مجموعات",
    # Physics
    "فيزياء", "ميكانيكا", "ديناميكا حرارية", "كهرومغناطيسية",
    "ميكانيك الكم", "فيزياء الكم", "نسبية", "بصريات", "نووي",
    "فلك", "فيزياء فلكية", "موجات", "جسيمات",
    # Chemistry
    "كيمياء", "عضوية", "لاعضوية", "كيمياء فيزيائية", "كهروكيمياء",
    "بلورة", "روابط كيميائية", "حركية التفاعل", "طيفية", "جدول دوري",
    # Computer Science
    "علم الحاسوب", "حاسوب", "حاسب", "برمجة", "خوارزميات", "بنية بيانات",
    "تعلم الآلة", "ذكاء اصطناعي", "شبكات عصبية", "تشفير",
    "قواعد بيانات", "شبكات حاسوبية", "هندسة برمجيات", "امن سيبراني",
}

# Arabic Unicode block range used to detect Arabic text
import re as _re
_ARABIC_CHAR_RE = _re.compile(r'[\u0600-\u06FF]')


# Patterns that strongly suggest STEM researcher-level queries even when no
# exact domain keyword is present (e.g. "Yang-Mills existence problem").
_RESEARCH_SIGNAL_RE = _re.compile(
    r'\b('
    r'theorem|conjecture|proof|lemma|corollary|equation|formula|'
    r'problem|hypothesis|model|theory|field|space|group|ring|'
    r'operator|transform|integral|derivative|matrix|tensor|'
    r'quantum|wave|energy|force|potential|amplitude|'
    r'synthesis|reaction|bond|orbital|entropy|'
    r'algorithm|complexity|computability|inference|'
    r'research|paper|publication|journal|arxiv|'
    r'open problem|unsolved|frontier|phd|doctoral|'
    r'approximation|convergence|divergence|stability|invariant'
    r')\b',
    _re.IGNORECASE,
)


def check_domain(prompt: str) -> tuple[bool, str | None]:
    """
    Returns (True, None) if the prompt touches an approved STEM domain.
    Returns (False, reason_message) if it should be blocked.
    """
    lowered = prompt.lower()
    for domain in APPROVED_DOMAINS:
        if domain in lowered:
            return True, None
    # If the prompt is written in Arabic, accept it and let the LLM guardrail
    # decide — the keyword list cannot cover all Arabic STEM phrasings.
    if _ARABIC_CHAR_RE.search(prompt):
        for kw in _ARABIC_STEM_KEYWORDS:
            if kw in prompt:
                return True, None
        # Arabic text with no recognised keyword: pass to LLM guardrail
        return True, None
    # If the prompt contains research/academic signals, pass to LLM guardrail.
    # This handles researcher-mode queries with advanced terminology that isn't
    # in the keyword list (e.g. "Yang-Mills existence and mass gap problem").
    if _RESEARCH_SIGNAL_RE.search(prompt):
        return True, None
    # Look for a specific out-of-scope key to give a helpful response
    for key, message in OUT_OF_SCOPE.items():
        if key != "default" and key in lowered:
            return False, message
    return False, OUT_OF_SCOPE["default"]
