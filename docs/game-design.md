# BooCake — Game Design Document

> Working title: **BooCake**
> Source of truth for the game concept. Summary of decisions lives in [../CLAUDE.md](../CLAUDE.md).

## Basic Elements

### What is the player trying to achieve? What does winning / completing the game look like?
The player runs a cupcake shop for monsters. Every level is one night, and each night has a money goal. To reach it, the player has to make the right cupcakes fast and get good tips. The goals are layered: finish one order, then reach the night's goal, then get through the whole week. The game is completed after 7 nights. The last night is Halloween, the busiest night of the week.

### What can the player do? List the primary verbs.
Read orders, bake, take out of the oven, frost, add topping, serve, throw away, buy upgrades.

Almost all of these are direct actions: you click a station and it happens right away. Buying upgrades is more indirect, because you buy garlic or a guard before the night starts and only see the effect later.

### Under what circumstances does the player win or succeed?
You win a night if you have earned enough money by midnight. If you earn more than the goal, you get up to 3 stars. During the night, serving the right cupcake quickly gives a bigger tip. You win the game when you finish night 7, Halloween.

### Under what circumstances does the player fail or lose?
If the night ends and you didn't reach the money goal, you lose that night and play it again. Some smaller things can also go wrong during a night:

- A customer waits too long and leaves without paying.
- A cupcake stays in the oven too long and burns.
- You give the wrong cupcake and get no tip.
- A vampire bites you and you can't move for 5 seconds.
- A thief steals your finished cupcakes.

We want every failure to feel fair, like "my mistake, I can do better next time." That's why the game always shows what went wrong: a burnt cupcake turns black, and an angry customer's face changes.

### Describe the moment-to-moment gameplay loop in 1–3 sentences.
Read the order → bake → take it out before it burns → frost and add topping → serve → get the tip → next customer. This repeats until midnight. Between nights you spend your tips on upgrades and start the next, harder night.

## Theme

### The fictional premise or "what if" that drives the game world.
What if monsters loved sweets too, and the only bakery open at night was yours? The monsters are not enemies, they are customers. But they still act like monsters: vampires bite, ghosts can't hold anything, and some of them just steal.

### Who or what does the player control?
The player is the baker behind the counter. The baker doesn't walk around; the mouse works like the baker's hands, so the view is a bit abstract. We only see the baker in some moments, for example when they get bitten by a vampire and freeze.

### Where does the game take place?
The game takes place in a small cupcake shop in a monster town. The camera is behind the counter: customers wait in line at the top of the screen, and the oven, frosting, and topping stations are at the bottom. The art style is cartoon-like, with pastel cupcake colors on dark purple and blue walls, plus candles, spider webs, and pumpkins. The tone is cute and spooky at the same time. It should feel like a Halloween party, not a horror game.

### Temporal context
Every level is one night shift: the shop opens at sunset and closes at midnight. A clock on the wall shows the time, and more customers come as it gets closer to midnight. The 7 nights are the week before Halloween, and the last night is Halloween itself. The game is not set in a real historical period; it is more like a fairy-tale world.

## Description of Play Experience
At the start of each night the shop feels calm and cozy. The first monster comes in, and the player feels relaxed and curious. Then more and more customers arrive, something in the oven is about to burn, and someone in line starts to look angry. It gets stressful, but in a fun way. When the player serves a few customers in a row without mistakes, they get into a good rhythm and it feels really satisfying.

Just when things get busy, something unexpected happens: a vampire bites you, or a thief runs away with your cupcakes. It's annoying for a second, but then it's funny, especially when the ghost drops its cupcake right through its body and still pays you. We want these moments to make players laugh, not get angry, so they want to play again.

Between nights the player can relax a bit and plan, like "I should buy garlic for tomorrow." Every night they feel a little more confident. On Halloween night, the last and craziest night, making it to midnight should feel like a real win.

## Annotated List of Design Values
- **Fun chaos (Experience):** The game should feel busy and a little overwhelming, but always fun. We want players to laugh while they rush, not feel stressed.
- **Slowly getting harder (Challenge):** Every night adds only one new thing, like a new monster or a faster pace. This way the difficulty grows with the player's skill and they stay in flow.
- **Mostly skill, a little luck (Skill, Strategy, Chance & Uncertainty):** Winning depends mostly on how fast and careful the player is. Random monsters add surprise, but players can prepare for them with garlic and a security guard, so losing feels fair.
- **Cute and spooky (Theme / Tone):** The monsters cause trouble in a silly way, not a scary way. For example, the ghost drops your cupcake but still pays.
- **Easy to understand (Decision-Making & Feedback):** Players should always see what is happening: the order, how patient the customer is, and how the cupcake is cooking. If they lose a tip, they should know why.

## Target Audience
Our game is for players aged 10 and up who like casual games. They don't need much gaming experience, so even people who rarely play games can enjoy it. It is for people who like cooking or time-management games, short arcade games, and funny characters. The game runs in a web browser and only needs a mouse. One night takes 2.5 minutes, so it's good for short breaks, like between classes, on the bus, or playing with friends who watch and laugh. Using Bartle's player types, it is mostly for Achievers who want to reach goals and get 3 stars, and also for players who just like silly surprises.
