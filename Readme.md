### SPEAR - Synthetic Precipitative Environmental Atteunation Radar Tool

**Stack**

This project is only intended to be a localized host application run internally with a simplified nodejs + typescript  express + React stack although we prefer the state to be handled largely by the backend node process. We are still presenting a interactive UI to the user in the form of visualization, buttons, UIs and controls, as a single pane application. We can save user sessions, scenarios, platforms etc out to local json files in the /data folder.

**Model Parameteric Simulation**

The objective is to facilitate the following simplified simulation based parameteric modeling of a target engagement radar against a single F-16/F-22/F-35 aircraft. The TER itself will contain properties such as detection range, time to acquire target, maximum effective range due to missile kinematics, and a missile velocity (mach). 

Scenario will be given a map and simulation bounds e.g, 100km, 100km on a grid and simulation time step, mapping and terrain is not neccessary, neither is a volume grid. Scenarios will be given names, descriptions and saved.

The fighter platform will assess effectiveness of its AGM-88 HARM against TER/SAM site platform by only engaging while the SAM is in its vulernability window (locked because fighter is approaching maximum effective missile range (MEMR) or some ratio of this). The fighter after AGM launch can either assume a straight path or some non-linear path to keep it within this maximum effective missile range (MEMR) so the SAM stays locked but the fighter remains on some fringe aspect (once again this can be a ratio of MEMR)

The delta between SAM site target kill time and AGM kill time asesses the scenario success or non success results. This can be calculated linearly somewhat easily but we want a way to simulate different scenarios and flight paths.

The radar detectability range will be determined by supplying a nominal detection range for a 1m^2 target. The radar range equation can be used to adjust the range for different radar cross sections. If you need the equations I can provide. Additionally attenuation for a single attenuative precipitation cell between the aircraft and the target will be considered. Allow the precipitation cell to have a size, location, and distribution of rain rate. We use this information and a single path trace to calculate a signal and therfore range loss. If we are able to generate a synthetic field of precipitation with a nominal rain rate, size variance, and precipitation variance this is even better. We will provide a tabular CSV dataset that lists the given attenuation in db/km at a specific frequency.

**Requirements/Charactersitcs of Modeled Scenario**
- SAM Site System Models (Nominal Range, Adjusted Range, Pulse Integrations given Pulse Model (Short, Medium, Long),Path Traced Attenuation Calculations, Manual Acquisition Time, Automatic Acquistion Time, Maximum Effective Missile Range, Missile Velocity, System Nominal Operating Frequency, Missile Final Tracking Radar Operating Frequency )

- Fighter Platform Model (F-16, F-22, F-35) - Specified Velocity, AGM-88 HARM Launch Preference, Multi-Aspect Radar Cross Section (Swerling 2), Parameteric Path in MEMR. AGM-88 HARM Velocity and tracking status.

- Save SAM/Fighter/Scenario Files out to disk json files on drive along with user sessions.

- Visualization Component: Operate with a dark UI, with Opacity adjusted rings overalying and feeding data such as MEMR, detection ranges. For the synthetic precipitation field we can overlay over the scenario after using a monochrome high pass filter over a heat map of the precip field.


**Synthetic Precipitation Fields**

Synthetic Precipitation Fields will be calculated as distributions of nominal rain rate, with gaussian fall off around the cell centers, and a distribution based on the desired intensity and distribution. Ensure that multiple cells occupying a similar area are not additive beyond a standard deviation of the nominal cell precipitation intensity. Precipitation intensity will be mapped directly to db/km attenuation values for path sampling.


**Implementation**
Implement this application with a the core spear-server nodejs + express application, data permanence will be handled via JSON file serialization only. Maintain basic web application architecture with simplistic user sessions (and authentication), routing endpoints, callbacks. For frontend application enforce that state is primarily enforced on the backend with allowance for some dynamic user states.

**Directory**

/app - public site directory
/src - node directory
/dist - typescript output
/src/data/itu - itu attenuation data expect csv file 5.0-15GhZ
/src/data/platforms - saved platform data
/src/data/scenarios - saved scenarios
/src/data/sessions - saved user sessions
/src/routes - route definitions
/src/services - api endpoints
/src/types - type modeling
/src/templates - site templates



