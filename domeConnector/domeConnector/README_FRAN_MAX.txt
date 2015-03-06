

FUCKED UP SAKER SOM MAX GRÅTIT ÖVER

Om projektet inte är startat som ett WIN32-projekt så blire grisigt jobbigt att få det att funka.

Se till att länkningen är korrekt, include directory är korrekt. 

Se även till att de två generarade DLL-erna (SmartFoxClientApi och någon som börjar på z) så lägg till dem i 
debug eller release foldern.

Står det att precompiled header-filen inte slutar nånstans så är det för att den inte
inkluderats överst i varje CPP-fil. 

Om precompiled header-filen är för liten för allt den includar, tryck på project properties > c++ > command-line och lägg till "Zm120" 
i nedre boxen.

