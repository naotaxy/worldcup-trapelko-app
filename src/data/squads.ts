import type { SquadPlayer } from '../types'

export const squadSource = "https://www.aljazeera.com/sports/2026/6/2/fifa-world-cup-2026-full-squads-48-teams-players"

const squadData = {
  "algeria": [
    {
      "name": "Oussama Benbot",
      "position": "GK"
    },
    {
      "name": "Melvin Masstil",
      "position": "GK"
    },
    {
      "name": "Luca Zidane",
      "position": "GK"
    },
    {
      "name": "Achraf Abada",
      "position": "DF"
    },
    {
      "name": "Rayan Ait Nouri",
      "position": "DF"
    },
    {
      "name": "Zinedine Belaid",
      "position": "DF"
    },
    {
      "name": "Rafik Belghali",
      "position": "DF"
    },
    {
      "name": "Ramy Bensebaini",
      "position": "DF"
    },
    {
      "name": "Samir Chergui",
      "position": "DF"
    },
    {
      "name": "Jaouen Hadjam",
      "position": "DF"
    },
    {
      "name": "Aissa Mandi",
      "position": "DF"
    },
    {
      "name": "Mohamed Amine Tougai",
      "position": "DF"
    },
    {
      "name": "Houssem Aouar",
      "position": "MF"
    },
    {
      "name": "Nabil Bentaleb",
      "position": "MF"
    },
    {
      "name": "Hicham Boudaoui",
      "position": "MF"
    },
    {
      "name": "Fares Chaibi",
      "position": "MF"
    },
    {
      "name": "Ibrahim Maza",
      "position": "MF"
    },
    {
      "name": "Yassine Titraoui",
      "position": "MF"
    },
    {
      "name": "Ramiz Zerrouki",
      "position": "MF"
    },
    {
      "name": "Mohamed Amine Amoura",
      "position": "FW"
    },
    {
      "name": "Nadir Benbouali",
      "position": "FW"
    },
    {
      "name": "Adil Boulbina",
      "position": "FW"
    },
    {
      "name": "Fares Ghedjemis",
      "position": "FW"
    },
    {
      "name": "Amine Gouiri",
      "position": "FW"
    },
    {
      "name": "Riyad Mahrez",
      "position": "FW"
    },
    {
      "name": "Anis Hadj Moussa",
      "position": "FW"
    }
  ],
  "argentina": [
    {
      "name": "Emiliano Martinez",
      "position": "GK"
    },
    {
      "name": "Geronimo Rulli",
      "position": "GK"
    },
    {
      "name": "Juan Musso",
      "position": "GK"
    },
    {
      "name": "Leonardo Balerdi",
      "position": "DF"
    },
    {
      "name": "Gonzalo Montiel",
      "position": "DF"
    },
    {
      "name": "Nicolas Tagliafico",
      "position": "DF"
    },
    {
      "name": "Lisandro Martinez",
      "position": "DF"
    },
    {
      "name": "Cristian Romero",
      "position": "DF"
    },
    {
      "name": "Nicolas Otamendi",
      "position": "DF"
    },
    {
      "name": "Facundo Medina",
      "position": "DF"
    },
    {
      "name": "Nahuel Molina",
      "position": "DF"
    },
    {
      "name": "Leandro Paredes",
      "position": "MF"
    },
    {
      "name": "Rodrigo De Paul",
      "position": "MF"
    },
    {
      "name": "Valentin Barco",
      "position": "MF"
    },
    {
      "name": "Giovani Lo Celso",
      "position": "MF"
    },
    {
      "name": "Exequiel Palacios",
      "position": "MF"
    },
    {
      "name": "Alexis Mac Allister",
      "position": "MF"
    },
    {
      "name": "Enzo Fernandez",
      "position": "MF"
    },
    {
      "name": "Julian Alvarez",
      "position": "FW"
    },
    {
      "name": "Lionel Messi",
      "position": "FW"
    },
    {
      "name": "Nicolas Gonzalez",
      "position": "FW"
    },
    {
      "name": "Thiago Almada",
      "position": "FW"
    },
    {
      "name": "Giuliano Simeone",
      "position": "FW"
    },
    {
      "name": "Nicolas Paz",
      "position": "FW"
    },
    {
      "name": "Jose Manuel Lopez",
      "position": "FW"
    },
    {
      "name": "Lautaro Martinez",
      "position": "FW"
    }
  ],
  "australia": [
    {
      "name": "Patrick Beach",
      "position": "GK"
    },
    {
      "name": "Paul Izzo",
      "position": "GK"
    },
    {
      "name": "Mathew Ryan",
      "position": "GK"
    },
    {
      "name": "Aziz Behich",
      "position": "DF"
    },
    {
      "name": "Jordan Bos",
      "position": "DF"
    },
    {
      "name": "Cameron Burgess",
      "position": "DF"
    },
    {
      "name": "Alessandro Circati",
      "position": "DF"
    },
    {
      "name": "Milos Degenek",
      "position": "DF"
    },
    {
      "name": "Jason Geria",
      "position": "DF"
    },
    {
      "name": "Lucas Herrington",
      "position": "DF"
    },
    {
      "name": "Jacob Italiano",
      "position": "DF"
    },
    {
      "name": "Harry Souttar",
      "position": "DF"
    },
    {
      "name": "Kai Trewin",
      "position": "DF"
    },
    {
      "name": "Cameron Devlin",
      "position": "MF"
    },
    {
      "name": "Ajdin Hrustic",
      "position": "MF"
    },
    {
      "name": "Jackson Irvine",
      "position": "MF"
    },
    {
      "name": "Connor Metcalfe",
      "position": "MF"
    },
    {
      "name": "Aiden O’Neill",
      "position": "MF"
    },
    {
      "name": "Paul Okon-Engstler",
      "position": "MF"
    },
    {
      "name": "Nestory Irankunda",
      "position": "FW"
    },
    {
      "name": "Mathew Leckie",
      "position": "FW"
    },
    {
      "name": "Awer Mabil",
      "position": "FW"
    },
    {
      "name": "Mohamed Toure",
      "position": "FW"
    },
    {
      "name": "Nishan Velupillay",
      "position": "FW"
    },
    {
      "name": "Cristian Volpato",
      "position": "FW"
    },
    {
      "name": "Tete Yengi",
      "position": "FW"
    }
  ],
  "austria": [
    {
      "name": "Patrick Pentz",
      "position": "GK"
    },
    {
      "name": "Alexander Schlager",
      "position": "GK"
    },
    {
      "name": "Florian Wiegele",
      "position": "GK"
    },
    {
      "name": "David Affengruber",
      "position": "DF"
    },
    {
      "name": "David Alaba",
      "position": "DF"
    },
    {
      "name": "Kevin Danso",
      "position": "DF"
    },
    {
      "name": "Marco Friedl",
      "position": "DF"
    },
    {
      "name": "Philipp Lienhart",
      "position": "DF"
    },
    {
      "name": "Phillipp Mwene",
      "position": "DF"
    },
    {
      "name": "Stefan Posch",
      "position": "DF"
    },
    {
      "name": "Alexander Prass",
      "position": "DF"
    },
    {
      "name": "Michael Svoboda",
      "position": "DF"
    },
    {
      "name": "Christoph Baumgartner",
      "position": "MF"
    },
    {
      "name": "Carney Chukwuemeka",
      "position": "MF"
    },
    {
      "name": "Florian Grillitsch",
      "position": "MF"
    },
    {
      "name": "Konrad Laimer",
      "position": "MF"
    },
    {
      "name": "Marcel Sabitzer",
      "position": "MF"
    },
    {
      "name": "Xaver Schlager",
      "position": "MF"
    },
    {
      "name": "Romano Schmid",
      "position": "MF"
    },
    {
      "name": "Alessandro Schopf",
      "position": "MF"
    },
    {
      "name": "Nicolas Seiwald",
      "position": "MF"
    },
    {
      "name": "Paul Wanner",
      "position": "MF"
    },
    {
      "name": "Patrick Wimmer",
      "position": "MF"
    },
    {
      "name": "Marko Arnautovic",
      "position": "FW"
    },
    {
      "name": "Michael Gregoritsch",
      "position": "FW"
    },
    {
      "name": "Sasa Kalajdzic",
      "position": "FW"
    }
  ],
  "belgium": [
    {
      "name": "Thibaut Courtois",
      "position": "GK"
    },
    {
      "name": "Senne Lammens",
      "position": "GK"
    },
    {
      "name": "Mike Penders",
      "position": "GK"
    },
    {
      "name": "Timothy Castagne",
      "position": "DF"
    },
    {
      "name": "Zeno Debast",
      "position": "DF"
    },
    {
      "name": "Maxim De Cuyper",
      "position": "DF"
    },
    {
      "name": "Koni De Winter",
      "position": "DF"
    },
    {
      "name": "Brandon Mechele",
      "position": "DF"
    },
    {
      "name": "Thomas Meunier",
      "position": "DF"
    },
    {
      "name": "Nathan Ngoy",
      "position": "DF"
    },
    {
      "name": "Joaquin Seys",
      "position": "DF"
    },
    {
      "name": "Arthur Theate",
      "position": "DF"
    },
    {
      "name": "Kevin De Bruyne",
      "position": "MF"
    },
    {
      "name": "Amadou Onana",
      "position": "MF"
    },
    {
      "name": "Nicolas Raskin",
      "position": "MF"
    },
    {
      "name": "Youri Tielemans",
      "position": "MF"
    },
    {
      "name": "Hans Vanaken",
      "position": "MF"
    },
    {
      "name": "Axel Witsel",
      "position": "MF"
    },
    {
      "name": "Charles De Ketelaere",
      "position": "FW"
    },
    {
      "name": "Jeremy Doku",
      "position": "FW"
    },
    {
      "name": "Matias Fernandez-Pardo",
      "position": "FW"
    },
    {
      "name": "Romelu Lukaku",
      "position": "FW"
    },
    {
      "name": "Dodi Lukebakio",
      "position": "FW"
    },
    {
      "name": "Diego Moreira",
      "position": "FW"
    },
    {
      "name": "Alexis Saelemaekers",
      "position": "FW"
    },
    {
      "name": "Leandro Trossard",
      "position": "FW"
    }
  ],
  "bosnia-herzegovina": [
    {
      "name": "Nikola Vasilj",
      "position": "GK"
    },
    {
      "name": "Martin Zlomislic",
      "position": "GK"
    },
    {
      "name": "Osman Hadzikic",
      "position": "GK"
    },
    {
      "name": "Sead Kolasinac",
      "position": "DF"
    },
    {
      "name": "Amar Dedic",
      "position": "DF"
    },
    {
      "name": "Nihad Mujakic",
      "position": "DF"
    },
    {
      "name": "Nikola Katic",
      "position": "DF"
    },
    {
      "name": "Tarik Muharemovic",
      "position": "DF"
    },
    {
      "name": "Stjepan Radeljic",
      "position": "DF"
    },
    {
      "name": "Dennis Hadzikadunic",
      "position": "DF"
    },
    {
      "name": "Nidal Celik",
      "position": "DF"
    },
    {
      "name": "Amir Hadziahmetovic",
      "position": "MF"
    },
    {
      "name": "Ivan Sunjic",
      "position": "MF"
    },
    {
      "name": "Ivan Basic",
      "position": "MF"
    },
    {
      "name": "Dzenis Burnic",
      "position": "MF"
    },
    {
      "name": "Ermin Mahmic",
      "position": "MF"
    },
    {
      "name": "Benjamin Tahirovic",
      "position": "MF"
    },
    {
      "name": "Amar Memic",
      "position": "MF"
    },
    {
      "name": "Armin Gigovic",
      "position": "MF"
    },
    {
      "name": "Kerim Alajbegovic",
      "position": "MF"
    },
    {
      "name": "Esmir Bajraktarevic",
      "position": "MF"
    },
    {
      "name": "Ermedin Demirovic",
      "position": "FW"
    },
    {
      "name": "Jovo Lukic",
      "position": "FW"
    },
    {
      "name": "Samed Bazdar",
      "position": "FW"
    },
    {
      "name": "Haris Tabakovic",
      "position": "FW"
    },
    {
      "name": "Edin Dzeko",
      "position": "FW"
    }
  ],
  "brazil": [
    {
      "name": "Alisson",
      "position": "GK"
    },
    {
      "name": "Ederson",
      "position": "GK"
    },
    {
      "name": "Weverton",
      "position": "GK"
    },
    {
      "name": "Alex Sandro",
      "position": "DF"
    },
    {
      "name": "Bremer",
      "position": "DF"
    },
    {
      "name": "Danilo",
      "position": "DF"
    },
    {
      "name": "Douglas Santos",
      "position": "DF"
    },
    {
      "name": "Gabriel Magalhaes",
      "position": "DF"
    },
    {
      "name": "Ibanez",
      "position": "DF"
    },
    {
      "name": "Leo Pereira",
      "position": "DF"
    },
    {
      "name": "Marquinhos",
      "position": "DF"
    },
    {
      "name": "Wesley",
      "position": "DF"
    },
    {
      "name": "Bruno Guimaraes",
      "position": "MF"
    },
    {
      "name": "Casemiro",
      "position": "MF"
    },
    {
      "name": "Danilo Santos",
      "position": "MF"
    },
    {
      "name": "Fabinho",
      "position": "MF"
    },
    {
      "name": "Lucas Paqueta",
      "position": "MF"
    },
    {
      "name": "Endrick",
      "position": "FW"
    },
    {
      "name": "Gabriel Martinelli",
      "position": "FW"
    },
    {
      "name": "Igor Thiago",
      "position": "FW"
    },
    {
      "name": "Luiz Henrique",
      "position": "FW"
    },
    {
      "name": "Matheus Cunha",
      "position": "FW"
    },
    {
      "name": "Neymar Jr",
      "position": "FW"
    },
    {
      "name": "Raphinha",
      "position": "FW"
    },
    {
      "name": "Rayan",
      "position": "FW"
    },
    {
      "name": "Vinicius Jr",
      "position": "FW"
    }
  ],
  "cabo-verde": [
    {
      "name": "CJ dos Santos",
      "position": "GK"
    },
    {
      "name": "Marcio Rosa",
      "position": "GK"
    },
    {
      "name": "Vozinha",
      "position": "GK"
    },
    {
      "name": "Sidny Cabral",
      "position": "DF"
    },
    {
      "name": "Diney Borges",
      "position": "DF"
    },
    {
      "name": "Logan Costa",
      "position": "DF"
    },
    {
      "name": "Roberto “Pico” Lopes",
      "position": "DF"
    },
    {
      "name": "Steven Moreira",
      "position": "DF"
    },
    {
      "name": "Wagner Pina",
      "position": "DF"
    },
    {
      "name": "Kelvin Pires",
      "position": "DF"
    },
    {
      "name": "Joao Paulo Fernandes",
      "position": "DF"
    },
    {
      "name": "Ianique “Stopira” Tavares",
      "position": "DF"
    },
    {
      "name": "Telmo Arcanjo",
      "position": "MF"
    },
    {
      "name": "Deroy Duarte",
      "position": "MF"
    },
    {
      "name": "Laros Duarte",
      "position": "MF"
    },
    {
      "name": "Jamiro Monteiro",
      "position": "MF"
    },
    {
      "name": "Kevin Pina",
      "position": "MF"
    },
    {
      "name": "Yannick Semedo",
      "position": "MF"
    },
    {
      "name": "Gilson Benchimol",
      "position": "FW"
    },
    {
      "name": "Jovane Cabral",
      "position": "FW"
    },
    {
      "name": "Dailon Livramento",
      "position": "FW"
    },
    {
      "name": "Ryan Mendes",
      "position": "FW"
    },
    {
      "name": "Nuno da Costa",
      "position": "FW"
    },
    {
      "name": "Garry Rodrigues",
      "position": "FW"
    },
    {
      "name": "Willy Semedo",
      "position": "FW"
    },
    {
      "name": "Helio Varela",
      "position": "FW"
    }
  ],
  "canada": [
    {
      "name": "Dayne St Clair",
      "position": "GK"
    },
    {
      "name": "Maxime Crepeau",
      "position": "GK"
    },
    {
      "name": "Owen Goodman",
      "position": "GK"
    },
    {
      "name": "Alistair Johnston",
      "position": "DF"
    },
    {
      "name": "Derek Cornelius",
      "position": "DF"
    },
    {
      "name": "Richie Laryea",
      "position": "DF"
    },
    {
      "name": "Niko Sigur",
      "position": "DF"
    },
    {
      "name": "Joel Waterman",
      "position": "DF"
    },
    {
      "name": "Luc de Fougerolles",
      "position": "DF"
    },
    {
      "name": "Moise Bombito",
      "position": "DF"
    },
    {
      "name": "Alphonso Davies",
      "position": "DF"
    },
    {
      "name": "Alfie Jones",
      "position": "DF"
    },
    {
      "name": "Stephen Eustaquio",
      "position": "MF"
    },
    {
      "name": "Ismael Kone",
      "position": "MF"
    },
    {
      "name": "Tajon Buchanan",
      "position": "MF"
    },
    {
      "name": "Mathieu Choiniere",
      "position": "MF"
    },
    {
      "name": "Ali Ahmed",
      "position": "MF"
    },
    {
      "name": "Nathan Saliba",
      "position": "MF"
    },
    {
      "name": "Liam Millar",
      "position": "MF"
    },
    {
      "name": "Jacob Shaffelburg",
      "position": "MF"
    },
    {
      "name": "Jonathan Osorio",
      "position": "MF"
    },
    {
      "name": "Jonathan David",
      "position": "FW"
    },
    {
      "name": "Cyle Larin",
      "position": "FW"
    },
    {
      "name": "Tani Oluwaseyi",
      "position": "FW"
    },
    {
      "name": "Promise David",
      "position": "FW"
    }
  ],
  "colombia": [
    {
      "name": "Camilo Vargas",
      "position": "GK"
    },
    {
      "name": "Alvaro Montero",
      "position": "GK"
    },
    {
      "name": "David Ospina",
      "position": "GK"
    },
    {
      "name": "Davinson Sanchez",
      "position": "DF"
    },
    {
      "name": "Jhon Lucumi",
      "position": "DF"
    },
    {
      "name": "Yerry Mina",
      "position": "DF"
    },
    {
      "name": "Willer Ditta",
      "position": "DF"
    },
    {
      "name": "Daniel Munoz",
      "position": "DF"
    },
    {
      "name": "Santiago Arias",
      "position": "DF"
    },
    {
      "name": "Johan Mojica",
      "position": "DF"
    },
    {
      "name": "Deiver Machado",
      "position": "DF"
    },
    {
      "name": "Richard Rios",
      "position": "MF"
    },
    {
      "name": "Jefferson Lerma",
      "position": "MF"
    },
    {
      "name": "Kevin Castano",
      "position": "MF"
    },
    {
      "name": "Juan Camilo Portilla",
      "position": "MF"
    },
    {
      "name": "Gustavo Puerta",
      "position": "MF"
    },
    {
      "name": "Jhon Arias",
      "position": "MF"
    },
    {
      "name": "Jorge Carrascal",
      "position": "MF"
    },
    {
      "name": "Juan Fernando Quintero",
      "position": "MF"
    },
    {
      "name": "James Rodriguez",
      "position": "MF"
    },
    {
      "name": "Jaminton Campaz",
      "position": "MF"
    },
    {
      "name": "Juan Camilo Hernandez",
      "position": "FW"
    },
    {
      "name": "Luis Diaz",
      "position": "FW"
    },
    {
      "name": "Luis Suarez",
      "position": "FW"
    },
    {
      "name": "Carlos Gomez",
      "position": "FW"
    },
    {
      "name": "Jhon Cordoba",
      "position": "FW"
    }
  ],
  "cote-divoire": [
    {
      "name": "Yahia Fofana",
      "position": "GK"
    },
    {
      "name": "Mohamed Kone",
      "position": "GK"
    },
    {
      "name": "Alban Lafont",
      "position": "GK"
    },
    {
      "name": "Emmanuel Agbadou",
      "position": "DF"
    },
    {
      "name": "Christopher Operi",
      "position": "DF"
    },
    {
      "name": "Ousmane Diomande",
      "position": "DF"
    },
    {
      "name": "Guela Doue",
      "position": "DF"
    },
    {
      "name": "Ghislain Konan",
      "position": "DF"
    },
    {
      "name": "Odilon Kossounou",
      "position": "DF"
    },
    {
      "name": "Wilfried Singo",
      "position": "DF"
    },
    {
      "name": "Evan Ndicka",
      "position": "DF"
    },
    {
      "name": "Seko Fofana",
      "position": "MF"
    },
    {
      "name": "Parfait Guiagon",
      "position": "MF"
    },
    {
      "name": "Christ Inao Oulai",
      "position": "MF"
    },
    {
      "name": "Franck Kessie",
      "position": "MF"
    },
    {
      "name": "Ibrahim Sangare",
      "position": "MF"
    },
    {
      "name": "Jean Michael Seri",
      "position": "MF"
    },
    {
      "name": "Simon Adingra",
      "position": "FW"
    },
    {
      "name": "Ange-Yoan Bonny",
      "position": "FW"
    },
    {
      "name": "Amad Diallo",
      "position": "FW"
    },
    {
      "name": "Oumar Diakite",
      "position": "FW"
    },
    {
      "name": "Yan Diomande",
      "position": "FW"
    },
    {
      "name": "Evann Guessand",
      "position": "FW"
    },
    {
      "name": "Nicolas Pepe",
      "position": "FW"
    },
    {
      "name": "Bazoumana Toure",
      "position": "FW"
    },
    {
      "name": "Elye Wahi",
      "position": "FW"
    }
  ],
  "croatia": [
    {
      "name": "Dominik Livakovic",
      "position": "GK"
    },
    {
      "name": "Dominik Kotarski",
      "position": "GK"
    },
    {
      "name": "Ivor Pandur",
      "position": "GK"
    },
    {
      "name": "Josko Gvardiol",
      "position": "DF"
    },
    {
      "name": "Duje Caleta-Car",
      "position": "DF"
    },
    {
      "name": "Josip Sutalo",
      "position": "DF"
    },
    {
      "name": "Josip Stanisic",
      "position": "DF"
    },
    {
      "name": "Marin Pongracic",
      "position": "DF"
    },
    {
      "name": "Martin Erlic",
      "position": "DF"
    },
    {
      "name": "Luka Vuskovic",
      "position": "DF"
    },
    {
      "name": "Luka Modric",
      "position": "MF"
    },
    {
      "name": "Mateo Kovacic",
      "position": "MF"
    },
    {
      "name": "Mario Pasalic",
      "position": "MF"
    },
    {
      "name": "Nikola Vlasic",
      "position": "MF"
    },
    {
      "name": "Luka Sucic",
      "position": "MF"
    },
    {
      "name": "Martin Baturina",
      "position": "MF"
    },
    {
      "name": "Kristijan Jakic",
      "position": "MF"
    },
    {
      "name": "Petar Sucic",
      "position": "MF"
    },
    {
      "name": "Nikola Moro",
      "position": "MF"
    },
    {
      "name": "Toni Fruk",
      "position": "MF"
    },
    {
      "name": "Ivan Perisic",
      "position": "FW"
    },
    {
      "name": "Andrej Kramaric",
      "position": "FW"
    },
    {
      "name": "Ante Budimir",
      "position": "FW"
    },
    {
      "name": "Marco Pasalic",
      "position": "FW"
    },
    {
      "name": "Petar Musa",
      "position": "FW"
    },
    {
      "name": "Igor Matanovic",
      "position": "FW"
    }
  ],
  "curacao": [
    {
      "name": "Tyrick Bodack",
      "position": "GK"
    },
    {
      "name": "Trevor Doornbusch",
      "position": "GK"
    },
    {
      "name": "Eloy Room",
      "position": "GK"
    },
    {
      "name": "Riechedly Bazoer",
      "position": "DF"
    },
    {
      "name": "Joshua Brenet",
      "position": "DF"
    },
    {
      "name": "Roshon van Eijma",
      "position": "DF"
    },
    {
      "name": "Sherel Floranus",
      "position": "DF"
    },
    {
      "name": "Deveron Fonville",
      "position": "DF"
    },
    {
      "name": "Jurien Gaari",
      "position": "DF"
    },
    {
      "name": "Armando Obispo",
      "position": "DF"
    },
    {
      "name": "Shurandy Sambo",
      "position": "DF"
    },
    {
      "name": "Juninho Bacuna",
      "position": "MF"
    },
    {
      "name": "Leandro Bacuna",
      "position": "MF"
    },
    {
      "name": "Livano Comenencia",
      "position": "MF"
    },
    {
      "name": "Kevin Felida",
      "position": "MF"
    },
    {
      "name": "Ar’jany Martha",
      "position": "MF"
    },
    {
      "name": "Tyrese Noslin",
      "position": "MF"
    },
    {
      "name": "Godfried Roemeratoe",
      "position": "MF"
    },
    {
      "name": "Jeremy Antonisse",
      "position": "FW"
    },
    {
      "name": "Tahith Chong",
      "position": "FW"
    },
    {
      "name": "Kenji Gorre",
      "position": "FW"
    },
    {
      "name": "Sontje Hansen",
      "position": "FW"
    },
    {
      "name": "Gervane Kastaneer",
      "position": "FW"
    },
    {
      "name": "Brandley Kuwas",
      "position": "FW"
    },
    {
      "name": "Jurgen Locadia",
      "position": "FW"
    },
    {
      "name": "Jearl Margaritha",
      "position": "FW"
    }
  ],
  "czechia": [
    {
      "name": "Lukas Hornicek",
      "position": "GK"
    },
    {
      "name": "Matej Kovar",
      "position": "GK"
    },
    {
      "name": "Jindrich Stanek",
      "position": "GK"
    },
    {
      "name": "Vladimir Coufal",
      "position": "DF"
    },
    {
      "name": "David Doudera",
      "position": "DF"
    },
    {
      "name": "Tomas Holes",
      "position": "DF"
    },
    {
      "name": "Robin Hranac",
      "position": "DF"
    },
    {
      "name": "Stepan Chaloupek",
      "position": "DF"
    },
    {
      "name": "David Jurasek",
      "position": "DF"
    },
    {
      "name": "Ladislav Krejci",
      "position": "DF"
    },
    {
      "name": "Jaroslav Zeleny",
      "position": "DF"
    },
    {
      "name": "David Zima",
      "position": "DF"
    },
    {
      "name": "Lukas Cerv",
      "position": "MF"
    },
    {
      "name": "Vladimir Darida",
      "position": "MF"
    },
    {
      "name": "Lukas Provod",
      "position": "MF"
    },
    {
      "name": "Michal Sadilek",
      "position": "MF"
    },
    {
      "name": "Hugo Sochurek",
      "position": "MF"
    },
    {
      "name": "Alexandr Sojka",
      "position": "MF"
    },
    {
      "name": "Tomas Soucek",
      "position": "MF"
    },
    {
      "name": "Pavel Sulc",
      "position": "MF"
    },
    {
      "name": "Denis Visinsky",
      "position": "MF"
    },
    {
      "name": "Adam Hlozek",
      "position": "FW"
    },
    {
      "name": "Tomas Chory",
      "position": "FW"
    },
    {
      "name": "Mojmir Chytil",
      "position": "FW"
    },
    {
      "name": "Jan Kuchta",
      "position": "FW"
    },
    {
      "name": "Patrik Schick",
      "position": "FW"
    }
  ],
  "dr-congo": [
    {
      "name": "Matthieu Epolo",
      "position": "GK"
    },
    {
      "name": "Timothy Fayulu",
      "position": "GK"
    },
    {
      "name": "Lionel Mpasi",
      "position": "GK"
    },
    {
      "name": "Dylan Batubinsika",
      "position": "DF"
    },
    {
      "name": "Gedeon Kalulu",
      "position": "DF"
    },
    {
      "name": "Steve Kapuadi",
      "position": "DF"
    },
    {
      "name": "Joris Kayembe",
      "position": "DF"
    },
    {
      "name": "Arthur Masuaku",
      "position": "DF"
    },
    {
      "name": "Chancel Mbemba",
      "position": "DF"
    },
    {
      "name": "Axel Tuanzebe",
      "position": "DF"
    },
    {
      "name": "Aaron Wan-Bissaka",
      "position": "DF"
    },
    {
      "name": "Brian Cipenga",
      "position": "MF"
    },
    {
      "name": "Meshack Elia",
      "position": "MF"
    },
    {
      "name": "Gael Kakuta",
      "position": "MF"
    },
    {
      "name": "Edo Kayembe",
      "position": "MF"
    },
    {
      "name": "Nathanael Mbuku",
      "position": "MF"
    },
    {
      "name": "Samuel Moutoussamy",
      "position": "MF"
    },
    {
      "name": "Ngal’ayel Mukau",
      "position": "MF"
    },
    {
      "name": "Charles Pickel",
      "position": "MF"
    },
    {
      "name": "Noah Sadiki",
      "position": "MF"
    },
    {
      "name": "Aaron Tshibola",
      "position": "MF"
    },
    {
      "name": "Cedric Bakambu",
      "position": "FW"
    },
    {
      "name": "Simon Banza",
      "position": "FW"
    },
    {
      "name": "Fiston Mayele",
      "position": "FW"
    },
    {
      "name": "Yoane Wissa",
      "position": "FW"
    },
    {
      "name": "Theo Bongonda",
      "position": "FW"
    }
  ],
  "ecuador": [
    {
      "name": "Hernan Galindez",
      "position": "GK"
    },
    {
      "name": "Moises Ramirez",
      "position": "GK"
    },
    {
      "name": "Gonzalo Valle",
      "position": "GK"
    },
    {
      "name": "Piero Hincapie",
      "position": "DF"
    },
    {
      "name": "Willian Pacho",
      "position": "DF"
    },
    {
      "name": "Pervis Estupinan",
      "position": "DF"
    },
    {
      "name": "Felix Torres",
      "position": "DF"
    },
    {
      "name": "Joel Ordonez",
      "position": "DF"
    },
    {
      "name": "Jackson Porozo",
      "position": "DF"
    },
    {
      "name": "Angelo Preciado",
      "position": "DF"
    },
    {
      "name": "Yaimar Medina",
      "position": "DF"
    },
    {
      "name": "Moises Caicedo",
      "position": "MF"
    },
    {
      "name": "Alan Franco",
      "position": "MF"
    },
    {
      "name": "Kendry Paez",
      "position": "MF"
    },
    {
      "name": "Gonzalo Plata",
      "position": "MF"
    },
    {
      "name": "Pedro Vite",
      "position": "MF"
    },
    {
      "name": "Jordy Alcivar",
      "position": "MF"
    },
    {
      "name": "Denil Castillo",
      "position": "MF"
    },
    {
      "name": "John Yeboah",
      "position": "MF"
    },
    {
      "name": "Nilson Angulo",
      "position": "MF"
    },
    {
      "name": "Alan Minda",
      "position": "MF"
    },
    {
      "name": "Enner Valencia",
      "position": "FW"
    },
    {
      "name": "Kevin Rodriguez",
      "position": "FW"
    },
    {
      "name": "Jordy Caicedo",
      "position": "FW"
    },
    {
      "name": "Anthony Valencia",
      "position": "FW"
    },
    {
      "name": "Jeremy Arevalo",
      "position": "FW"
    }
  ],
  "egypt": [
    {
      "name": "Mohamed El Shenawy",
      "position": "GK"
    },
    {
      "name": "Mostafa Shobeir",
      "position": "GK"
    },
    {
      "name": "El Mahdy Soliman",
      "position": "GK"
    },
    {
      "name": "Mohamed Alaa",
      "position": "GK"
    },
    {
      "name": "Mohamed Abdelmonem",
      "position": "DF"
    },
    {
      "name": "Mohamed Hany",
      "position": "DF"
    },
    {
      "name": "Yasser Ibrahim",
      "position": "DF"
    },
    {
      "name": "Hossam Abdelmaguid",
      "position": "DF"
    },
    {
      "name": "Ahmed Fattouh",
      "position": "DF"
    },
    {
      "name": "Tarek Alaa",
      "position": "DF"
    },
    {
      "name": "Rami Rabia",
      "position": "DF"
    },
    {
      "name": "Karim Hafez",
      "position": "DF"
    },
    {
      "name": "Marwan Attia",
      "position": "MF"
    },
    {
      "name": "Ahmed Sayed “Zizo”",
      "position": "MF"
    },
    {
      "name": "Mahmoud Hassan “Trezeguet”",
      "position": "MF"
    },
    {
      "name": "Emam Ashour",
      "position": "MF"
    },
    {
      "name": "Mostafa Abdel Raouf",
      "position": "MF"
    },
    {
      "name": "Mohannad Lasheen",
      "position": "MF"
    },
    {
      "name": "Haitham Hassan",
      "position": "MF"
    },
    {
      "name": "Mahmoud Saber",
      "position": "MF"
    },
    {
      "name": "Ibrahim Adel",
      "position": "MF"
    },
    {
      "name": "Nabil Emad",
      "position": "MF"
    },
    {
      "name": "Hamdi Fathi",
      "position": "MF"
    },
    {
      "name": "Mohamed Salah",
      "position": "FW"
    },
    {
      "name": "Omar Marmoush",
      "position": "FW"
    },
    {
      "name": "Hamza Abdel Karim",
      "position": "FW"
    }
  ],
  "england": [
    {
      "name": "Jordan Pickford",
      "position": "GK"
    },
    {
      "name": "Dean Henderson",
      "position": "GK"
    },
    {
      "name": "James Trafford",
      "position": "GK"
    },
    {
      "name": "Reece James",
      "position": "DF"
    },
    {
      "name": "Ezri Konsa",
      "position": "DF"
    },
    {
      "name": "Jarell Quansah",
      "position": "DF"
    },
    {
      "name": "John Stones",
      "position": "DF"
    },
    {
      "name": "Marc Guehi",
      "position": "DF"
    },
    {
      "name": "Dan Burn",
      "position": "DF"
    },
    {
      "name": "Nico O’Reilly",
      "position": "DF"
    },
    {
      "name": "Djed Spence",
      "position": "DF"
    },
    {
      "name": "Tino Livramento",
      "position": "DF"
    },
    {
      "name": "Declan Rice",
      "position": "MF"
    },
    {
      "name": "Elliot Anderson",
      "position": "MF"
    },
    {
      "name": "Kobbie Mainoo",
      "position": "MF"
    },
    {
      "name": "Jordan Henderson",
      "position": "MF"
    },
    {
      "name": "Morgan Rogers",
      "position": "MF"
    },
    {
      "name": "Jude Bellingham",
      "position": "MF"
    },
    {
      "name": "Eberechi Eze",
      "position": "MF"
    },
    {
      "name": "Harry Kane",
      "position": "FW"
    },
    {
      "name": "Ivan Toney",
      "position": "FW"
    },
    {
      "name": "Ollie Watkins",
      "position": "FW"
    },
    {
      "name": "Bukayo Saka",
      "position": "FW"
    },
    {
      "name": "Marcus Rashford",
      "position": "FW"
    },
    {
      "name": "Anthony Gordon",
      "position": "FW"
    },
    {
      "name": "Noni Madueke",
      "position": "FW"
    }
  ],
  "france": [
    {
      "name": "Mike Maignan",
      "position": "GK"
    },
    {
      "name": "Robin Risser",
      "position": "GK"
    },
    {
      "name": "Brice Samba",
      "position": "GK"
    },
    {
      "name": "Lucas Digne",
      "position": "DF"
    },
    {
      "name": "Malo Gusto",
      "position": "DF"
    },
    {
      "name": "Lucas Hernandez",
      "position": "DF"
    },
    {
      "name": "Theo Hernandez",
      "position": "DF"
    },
    {
      "name": "Ibrahima Konate",
      "position": "DF"
    },
    {
      "name": "Maxence Lacroix",
      "position": "DF"
    },
    {
      "name": "Jules Kounde",
      "position": "DF"
    },
    {
      "name": "William Saliba",
      "position": "DF"
    },
    {
      "name": "Dayot Upamecano",
      "position": "DF"
    },
    {
      "name": "N’Golo Kante",
      "position": "MF"
    },
    {
      "name": "Manu Kone",
      "position": "MF"
    },
    {
      "name": "Adrien Rabiot",
      "position": "MF"
    },
    {
      "name": "Aurelien Tchouameni",
      "position": "MF"
    },
    {
      "name": "Warren Zaire-Emery",
      "position": "MF"
    },
    {
      "name": "Maghnes Akliouche",
      "position": "FW"
    },
    {
      "name": "Bradley Barcola",
      "position": "FW"
    },
    {
      "name": "Rayan Cherki",
      "position": "FW"
    },
    {
      "name": "Ousmane Dembele",
      "position": "FW"
    },
    {
      "name": "Desire Doue",
      "position": "FW"
    },
    {
      "name": "Michael Olise",
      "position": "FW"
    },
    {
      "name": "Kylian Mbappe",
      "position": "FW"
    },
    {
      "name": "Jean-Philippe Mateta",
      "position": "FW"
    },
    {
      "name": "Marcus Thuram",
      "position": "FW"
    }
  ],
  "germany": [
    {
      "name": "Manuel Neuer",
      "position": "GK"
    },
    {
      "name": "Oliver Baumann",
      "position": "GK"
    },
    {
      "name": "Alexander Nuebel",
      "position": "GK"
    },
    {
      "name": "Nico Schlotterbeck",
      "position": "DF"
    },
    {
      "name": "David Raum",
      "position": "DF"
    },
    {
      "name": "Nathaniel Brown",
      "position": "DF"
    },
    {
      "name": "Jonathan Tah",
      "position": "DF"
    },
    {
      "name": "Waldemar Anton",
      "position": "DF"
    },
    {
      "name": "Joshua Kimmich",
      "position": "DF"
    },
    {
      "name": "Malick Thiaw",
      "position": "DF"
    },
    {
      "name": "Antonio Rudiger",
      "position": "DF"
    },
    {
      "name": "Pascal Gross",
      "position": "MF"
    },
    {
      "name": "Leon Goretzka",
      "position": "MF"
    },
    {
      "name": "Felix Nmecha",
      "position": "MF"
    },
    {
      "name": "Jamal Musiala",
      "position": "MF"
    },
    {
      "name": "Nadiem Amiri",
      "position": "MF"
    },
    {
      "name": "Jamie Leweling",
      "position": "MF"
    },
    {
      "name": "Lennart Karl",
      "position": "MF"
    },
    {
      "name": "Florian Wirtz",
      "position": "MF"
    },
    {
      "name": "Leroy Sane",
      "position": "MF"
    },
    {
      "name": "Aleksandar Pavlovic",
      "position": "MF"
    },
    {
      "name": "Angelo Stiller",
      "position": "MF"
    },
    {
      "name": "Kai Havertz",
      "position": "FW"
    },
    {
      "name": "Nick Woltemade",
      "position": "FW"
    },
    {
      "name": "Deniz Undav",
      "position": "FW"
    },
    {
      "name": "Maximilian Beier",
      "position": "FW"
    }
  ],
  "ghana": [
    {
      "name": "Joseph Anang",
      "position": "GK"
    },
    {
      "name": "Benjamin Asare",
      "position": "GK"
    },
    {
      "name": "Lawrence Ati-Zigi",
      "position": "GK"
    },
    {
      "name": "Jonas Adjetey",
      "position": "DF"
    },
    {
      "name": "Derrick Luckassen",
      "position": "DF"
    },
    {
      "name": "Gideon Mensah",
      "position": "DF"
    },
    {
      "name": "Abdul Mumin",
      "position": "DF"
    },
    {
      "name": "Jerome Opoku",
      "position": "DF"
    },
    {
      "name": "Kojo Oppong Preprah",
      "position": "DF"
    },
    {
      "name": "Baba Abdul Rahman",
      "position": "DF"
    },
    {
      "name": "Alidu Seidu",
      "position": "DF"
    },
    {
      "name": "Marvin Senaya",
      "position": "DF"
    },
    {
      "name": "Augustine Boakye",
      "position": "MF"
    },
    {
      "name": "Abdul Fatawu Issahaku",
      "position": "MF"
    },
    {
      "name": "Elisha Owusu",
      "position": "MF"
    },
    {
      "name": "Thomas Partey",
      "position": "MF"
    },
    {
      "name": "Kwasi Sibo",
      "position": "MF"
    },
    {
      "name": "Kamal Deen Sulemana",
      "position": "MF"
    },
    {
      "name": "Caleb Yirenkyi",
      "position": "MF"
    },
    {
      "name": "Prince Kwabena Adu",
      "position": "FW"
    },
    {
      "name": "Jordan Ayew",
      "position": "FW"
    },
    {
      "name": "Christopher Bonsu Baah",
      "position": "FW"
    },
    {
      "name": "Ernest Nuamah",
      "position": "FW"
    },
    {
      "name": "Antoine Semenyo",
      "position": "FW"
    },
    {
      "name": "Brandon Thomas-Asante",
      "position": "FW"
    },
    {
      "name": "Inaki Williams",
      "position": "FW"
    }
  ],
  "haiti": [
    {
      "name": "Josue Duverger",
      "position": "GK"
    },
    {
      "name": "Alexandre Pierre",
      "position": "GK"
    },
    {
      "name": "Johny Placide",
      "position": "GK"
    },
    {
      "name": "Ricardo Ade",
      "position": "DF"
    },
    {
      "name": "Carlens Arcus",
      "position": "DF"
    },
    {
      "name": "Hannes Delcroix",
      "position": "DF"
    },
    {
      "name": "Jean-Kevin Duverne",
      "position": "DF"
    },
    {
      "name": "Martin Experience",
      "position": "DF"
    },
    {
      "name": "Duke Lacroix",
      "position": "DF"
    },
    {
      "name": "Wilguens Paugain",
      "position": "DF"
    },
    {
      "name": "Keeto Thermoncy",
      "position": "DF"
    },
    {
      "name": "Carl Fred Sainte",
      "position": "MF"
    },
    {
      "name": "Jean-Ricner Bellegarde",
      "position": "MF"
    },
    {
      "name": "Leverton Pierre",
      "position": "MF"
    },
    {
      "name": "Danley Jean Jacques",
      "position": "MF"
    },
    {
      "name": "Woodensky Pierre",
      "position": "MF"
    },
    {
      "name": "Dominique Simon",
      "position": "MF"
    },
    {
      "name": "Josue Casimir",
      "position": "FW"
    },
    {
      "name": "Louicius Deedson",
      "position": "FW"
    },
    {
      "name": "Derrick Etienne Jr.",
      "position": "FW"
    },
    {
      "name": "Yassin Fortune",
      "position": "FW"
    },
    {
      "name": "Wilson Isidor",
      "position": "FW"
    },
    {
      "name": "Lenny Joseph",
      "position": "FW"
    },
    {
      "name": "Duckens Nazon",
      "position": "FW"
    },
    {
      "name": "Frantzdy Pierrot",
      "position": "FW"
    },
    {
      "name": "Ruben Providence",
      "position": "FW"
    }
  ],
  "iran": [
    {
      "name": "Alireza Beiranvand",
      "position": "GK"
    },
    {
      "name": "Seyed Hossein Hosseini",
      "position": "GK"
    },
    {
      "name": "Payam Niazmand",
      "position": "GK"
    },
    {
      "name": "Danial Eiri",
      "position": "DF"
    },
    {
      "name": "Ehsan Hajsafi",
      "position": "DF"
    },
    {
      "name": "Saleh Hardani",
      "position": "DF"
    },
    {
      "name": "Hossein Kanaani",
      "position": "DF"
    },
    {
      "name": "Shoja Khalilzadeh",
      "position": "DF"
    },
    {
      "name": "Milad Mohammadi",
      "position": "DF"
    },
    {
      "name": "Ali Nemati",
      "position": "DF"
    },
    {
      "name": "Ramin Rezaeian",
      "position": "DF"
    },
    {
      "name": "Rouzbeh Cheshmi",
      "position": "MF"
    },
    {
      "name": "Saeid Ezatolahi",
      "position": "MF"
    },
    {
      "name": "Mehdi Ghaedi",
      "position": "MF"
    },
    {
      "name": "Saman Ghoddos",
      "position": "MF"
    },
    {
      "name": "Mohammad Ghorbani",
      "position": "MF"
    },
    {
      "name": "Alireza Jahanbakhsh",
      "position": "MF"
    },
    {
      "name": "Mohammad Mohebi",
      "position": "MF"
    },
    {
      "name": "Amir Mohammad Razzaghinia",
      "position": "MF"
    },
    {
      "name": "Mehdi Torabi",
      "position": "MF"
    },
    {
      "name": "Aria Yousefi",
      "position": "MF"
    },
    {
      "name": "Ali Alipour",
      "position": "FW"
    },
    {
      "name": "Dennis Dargahi",
      "position": "FW"
    },
    {
      "name": "Amirhossein Hosseinzadeh",
      "position": "FW"
    },
    {
      "name": "Mehdi Taremi",
      "position": "FW"
    },
    {
      "name": "Shahriar Moghanlou",
      "position": "FW"
    }
  ],
  "iraq": [
    {
      "name": "Fahad Talib",
      "position": "GK"
    },
    {
      "name": "Jalal Hassan",
      "position": "GK"
    },
    {
      "name": "Ahmed Basil",
      "position": "GK"
    },
    {
      "name": "Hussein Ali",
      "position": "DF"
    },
    {
      "name": "Manaf Younis",
      "position": "DF"
    },
    {
      "name": "Zaid Tahseen",
      "position": "DF"
    },
    {
      "name": "Rebin Sulaka",
      "position": "DF"
    },
    {
      "name": "Akam Hashem",
      "position": "DF"
    },
    {
      "name": "Merchas Doski",
      "position": "DF"
    },
    {
      "name": "Ahmed Yahya",
      "position": "DF"
    },
    {
      "name": "Zaid Ismail",
      "position": "DF"
    },
    {
      "name": "Frans Putros",
      "position": "DF"
    },
    {
      "name": "Mustafa Saadoon",
      "position": "DF"
    },
    {
      "name": "Amir Al Ammari",
      "position": "MF"
    },
    {
      "name": "Kevin Yakob",
      "position": "MF"
    },
    {
      "name": "Zidane Iqbal",
      "position": "MF"
    },
    {
      "name": "Aimar Sher",
      "position": "MF"
    },
    {
      "name": "Ibrahim Bayesh",
      "position": "MF"
    },
    {
      "name": "Ahmed Qasim",
      "position": "MF"
    },
    {
      "name": "Youssef Amyn",
      "position": "MF"
    },
    {
      "name": "Marko Farji",
      "position": "MF"
    },
    {
      "name": "Ali Jassim",
      "position": "FW"
    },
    {
      "name": "Ali Al Hamadi",
      "position": "FW"
    },
    {
      "name": "Ali Yousef",
      "position": "FW"
    },
    {
      "name": "Aymen Hussein",
      "position": "FW"
    },
    {
      "name": "Mohanad Ali",
      "position": "FW"
    }
  ],
  "japan": [
    {
      "name": "Tomoki Hayakawa",
      "position": "GK"
    },
    {
      "name": "Keisuke Osako",
      "position": "GK"
    },
    {
      "name": "Zion Suzuki",
      "position": "GK"
    },
    {
      "name": "Ko Itakura",
      "position": "DF"
    },
    {
      "name": "Hiroki Ito",
      "position": "DF"
    },
    {
      "name": "Yuto Nagatomo",
      "position": "DF"
    },
    {
      "name": "Ayumu Seko",
      "position": "DF"
    },
    {
      "name": "Yukinari Sugawara",
      "position": "DF"
    },
    {
      "name": "Junnosuke Suzuki",
      "position": "DF"
    },
    {
      "name": "Shogo Taniguchi",
      "position": "DF"
    },
    {
      "name": "Takehiro Tomiyasu",
      "position": "DF"
    },
    {
      "name": "Tsuyoshi Watanabe",
      "position": "DF"
    },
    {
      "name": "Ritsu Doan",
      "position": "MF"
    },
    {
      "name": "Wataru Endo",
      "position": "MF"
    },
    {
      "name": "Junya Ito",
      "position": "MF"
    },
    {
      "name": "Daichi Kamada",
      "position": "MF"
    },
    {
      "name": "Takefusa Kubo",
      "position": "MF"
    },
    {
      "name": "Keito Nakamura",
      "position": "MF"
    },
    {
      "name": "Kaishu Sano",
      "position": "MF"
    },
    {
      "name": "Ao Tanaka",
      "position": "MF"
    },
    {
      "name": "Keisuke Goto",
      "position": "FW"
    },
    {
      "name": "Daizen Maeda",
      "position": "FW"
    },
    {
      "name": "Koki Ogawa",
      "position": "FW"
    },
    {
      "name": "Kento Shiogai",
      "position": "FW"
    },
    {
      "name": "Yuito Suzuki",
      "position": "FW"
    },
    {
      "name": "Ayase Ueda",
      "position": "FW"
    }
  ],
  "jordan": [
    {
      "name": "Yazid Abulaila",
      "position": "GK"
    },
    {
      "name": "Noor Bani Attiah",
      "position": "GK"
    },
    {
      "name": "Abdallah Al Fakhouri",
      "position": "GK"
    },
    {
      "name": "Mohammad Abu Hashish",
      "position": "DF"
    },
    {
      "name": "Abdullah Nasib",
      "position": "DF"
    },
    {
      "name": "Hussam Abu Dhahab",
      "position": "DF"
    },
    {
      "name": "Yazan Al Arab",
      "position": "DF"
    },
    {
      "name": "Mohammad Abu Alnadi",
      "position": "DF"
    },
    {
      "name": "Salem Obaid",
      "position": "DF"
    },
    {
      "name": "Saed Al Rosan",
      "position": "DF"
    },
    {
      "name": "Ehsan Haddad",
      "position": "DF"
    },
    {
      "name": "Anas Badawi",
      "position": "DF"
    },
    {
      "name": "Amer Jamous",
      "position": "MF"
    },
    {
      "name": "Noor Al Rawabdeh",
      "position": "MF"
    },
    {
      "name": "Rajaei Ayed",
      "position": "MF"
    },
    {
      "name": "Ibrahim Sadeh",
      "position": "MF"
    },
    {
      "name": "Mohannad Abu Taha",
      "position": "MF"
    },
    {
      "name": "Nizar Al Rashdan",
      "position": "MF"
    },
    {
      "name": "Mohammad Al Dawoud",
      "position": "MF"
    },
    {
      "name": "Mahmoud Mardahi",
      "position": "MF"
    },
    {
      "name": "Mohammad Abu Zraiq",
      "position": "FW"
    },
    {
      "name": "Ali Olwan",
      "position": "FW"
    },
    {
      "name": "Mousa Al Tamari",
      "position": "FW"
    },
    {
      "name": "Odeh Fakhoury",
      "position": "FW"
    },
    {
      "name": "Ibrahim Sabra",
      "position": "FW"
    },
    {
      "name": "Ali Azaizeh",
      "position": "FW"
    }
  ],
  "korea-republic": [
    {
      "name": "Song Bumkeun",
      "position": "GK"
    },
    {
      "name": "Jo Hyeonwoo",
      "position": "GK"
    },
    {
      "name": "Kim Seung-gyu",
      "position": "GK"
    },
    {
      "name": "Jens Castrop",
      "position": "DF"
    },
    {
      "name": "Lee Hanbeom",
      "position": "DF"
    },
    {
      "name": "Park Jinseob",
      "position": "DF"
    },
    {
      "name": "Lee Kihyuk",
      "position": "DF"
    },
    {
      "name": "Kim Minjae",
      "position": "DF"
    },
    {
      "name": "Kim Moonhwan",
      "position": "DF"
    },
    {
      "name": "Kim Taehyeon",
      "position": "DF"
    },
    {
      "name": "Lee Taeseok",
      "position": "DF"
    },
    {
      "name": "Seol Youngwoo",
      "position": "DF"
    },
    {
      "name": "Cho Wije",
      "position": "DF"
    },
    {
      "name": "Lee Donggyeong",
      "position": "MF"
    },
    {
      "name": "Hwang Heechan",
      "position": "MF"
    },
    {
      "name": "Yang Hyunjun",
      "position": "MF"
    },
    {
      "name": "Hwang Inbeom",
      "position": "MF"
    },
    {
      "name": "Lee Jaesung",
      "position": "MF"
    },
    {
      "name": "Kim Jingyu",
      "position": "MF"
    },
    {
      "name": "Eom Jisung",
      "position": "MF"
    },
    {
      "name": "Bae Junho",
      "position": "MF"
    },
    {
      "name": "Lee Kangin",
      "position": "MF"
    },
    {
      "name": "Paik Seungho",
      "position": "MF"
    },
    {
      "name": "Cho Guesung",
      "position": "FW"
    },
    {
      "name": "Son Heungmin",
      "position": "FW"
    },
    {
      "name": "Oh Hyeongyu",
      "position": "FW"
    }
  ],
  "mexico": [
    {
      "name": "Raul Rangel",
      "position": "GK"
    },
    {
      "name": "Guillermo Ochoa",
      "position": "GK"
    },
    {
      "name": "Carlos Acevedo",
      "position": "GK"
    },
    {
      "name": "Jorge Sanchez",
      "position": "DF"
    },
    {
      "name": "Israel Reyes",
      "position": "DF"
    },
    {
      "name": "Cesar Montes",
      "position": "DF"
    },
    {
      "name": "Johan Vasquez",
      "position": "DF"
    },
    {
      "name": "Jesus Gallardo",
      "position": "DF"
    },
    {
      "name": "Mateo Chavez",
      "position": "DF"
    },
    {
      "name": "Edson Alvarez",
      "position": "DF"
    },
    {
      "name": "Erik Lira",
      "position": "MF"
    },
    {
      "name": "Orbelin Pineda",
      "position": "MF"
    },
    {
      "name": "Alvaro Fidalgo",
      "position": "MF"
    },
    {
      "name": "Brian Gutierrez",
      "position": "MF"
    },
    {
      "name": "Luis Romo",
      "position": "MF"
    },
    {
      "name": "Obed Vargas",
      "position": "MF"
    },
    {
      "name": "Gilberto Mora",
      "position": "MF"
    },
    {
      "name": "Luis Chavez",
      "position": "MF"
    },
    {
      "name": "Roberto Alvarado",
      "position": "FW"
    },
    {
      "name": "Cesar Huerta",
      "position": "FW"
    },
    {
      "name": "Alexis Vega",
      "position": "FW"
    },
    {
      "name": "Julian Quinones",
      "position": "FW"
    },
    {
      "name": "Guillermo Martinez",
      "position": "FW"
    },
    {
      "name": "Armando Gonzalez",
      "position": "FW"
    },
    {
      "name": "Santiago Gimenez",
      "position": "FW"
    },
    {
      "name": "Raul Jimenez",
      "position": "FW"
    }
  ],
  "morocco": [
    {
      "name": "Yassine Bounou",
      "position": "GK"
    },
    {
      "name": "Munir El Kajoui",
      "position": "GK"
    },
    {
      "name": "Ahmed Reda Tagnaouti",
      "position": "GK"
    },
    {
      "name": "Noussair Mazraoui",
      "position": "DF"
    },
    {
      "name": "Anas Salah-Eddine",
      "position": "DF"
    },
    {
      "name": "Youssef Bellammari",
      "position": "DF"
    },
    {
      "name": "Achraf Hakimi",
      "position": "DF"
    },
    {
      "name": "Zakaria El Ouahdi",
      "position": "DF"
    },
    {
      "name": "Nayef Aguerd",
      "position": "DF"
    },
    {
      "name": "Chadi Riad",
      "position": "DF"
    },
    {
      "name": "Redouane Halhal",
      "position": "DF"
    },
    {
      "name": "Issa Diop",
      "position": "DF"
    },
    {
      "name": "Samir El Mourabet",
      "position": "MF"
    },
    {
      "name": "Ayoub Bouaddi",
      "position": "MF"
    },
    {
      "name": "Neil El Aynaoui",
      "position": "MF"
    },
    {
      "name": "Sofyan Amrabat",
      "position": "MF"
    },
    {
      "name": "Azzedine Ounahi",
      "position": "MF"
    },
    {
      "name": "Bilal El Khannouss",
      "position": "MF"
    },
    {
      "name": "Ismael Saibari",
      "position": "MF"
    },
    {
      "name": "Abdesamad Ezzalzouli",
      "position": "FW"
    },
    {
      "name": "Chemsdine Talbi",
      "position": "FW"
    },
    {
      "name": "Soufiane Rahimi",
      "position": "FW"
    },
    {
      "name": "Ayoub El Kaabi",
      "position": "FW"
    },
    {
      "name": "Brahim Diaz",
      "position": "FW"
    },
    {
      "name": "Yassine Gessim",
      "position": "FW"
    },
    {
      "name": "Ayoube Amaimouni-Echghouyab",
      "position": "FW"
    }
  ],
  "netherlands": [
    {
      "name": "Mark Flekken",
      "position": "GK"
    },
    {
      "name": "Robin Roefs",
      "position": "GK"
    },
    {
      "name": "Bart Verbruggen",
      "position": "GK"
    },
    {
      "name": "Nathan Ake",
      "position": "DF"
    },
    {
      "name": "Virgil van Dijk",
      "position": "DF"
    },
    {
      "name": "Denzel Dumfries",
      "position": "DF"
    },
    {
      "name": "Jan Paul van Hecke",
      "position": "DF"
    },
    {
      "name": "Jurrien Timber",
      "position": "DF"
    },
    {
      "name": "Jorrel Hato",
      "position": "DF"
    },
    {
      "name": "Micky van de Ven",
      "position": "DF"
    },
    {
      "name": "Ryan Gravenberch",
      "position": "MF"
    },
    {
      "name": "Frenkie de Jong",
      "position": "MF"
    },
    {
      "name": "Teun Koopmeiners",
      "position": "MF"
    },
    {
      "name": "Tijjani Reijnders",
      "position": "MF"
    },
    {
      "name": "Marten de Roon",
      "position": "MF"
    },
    {
      "name": "Guus Til",
      "position": "MF"
    },
    {
      "name": "Quinten Timber",
      "position": "MF"
    },
    {
      "name": "Mats Wieffer",
      "position": "MF"
    },
    {
      "name": "Brian Brobbey",
      "position": "FW"
    },
    {
      "name": "Memphis Depay",
      "position": "FW"
    },
    {
      "name": "Cody Gakpo",
      "position": "FW"
    },
    {
      "name": "Noa Lang",
      "position": "FW"
    },
    {
      "name": "Donyell Malen",
      "position": "FW"
    },
    {
      "name": "Crysencio Summerville",
      "position": "FW"
    },
    {
      "name": "Wout Weghorst",
      "position": "FW"
    },
    {
      "name": "Justin Kluivert",
      "position": "FW"
    }
  ],
  "new-zealand": [
    {
      "name": "Max Crocombe",
      "position": "GK"
    },
    {
      "name": "Alex Paulsen",
      "position": "GK"
    },
    {
      "name": "Michael Woud",
      "position": "GK"
    },
    {
      "name": "Tyler Bindon",
      "position": "DF"
    },
    {
      "name": "Michael Boxall",
      "position": "DF"
    },
    {
      "name": "Liberato Cacace",
      "position": "DF"
    },
    {
      "name": "Francis de Vries",
      "position": "DF"
    },
    {
      "name": "Callan Elliot",
      "position": "DF"
    },
    {
      "name": "Tim Payne",
      "position": "DF"
    },
    {
      "name": "Nando Pijnaker",
      "position": "DF"
    },
    {
      "name": "Tommy Smith",
      "position": "DF"
    },
    {
      "name": "Finn Surman",
      "position": "DF"
    },
    {
      "name": "Lachlan Bayliss",
      "position": "MF"
    },
    {
      "name": "Joe Bell",
      "position": "MF"
    },
    {
      "name": "Matt Garbett",
      "position": "MF"
    },
    {
      "name": "Eli Just",
      "position": "MF"
    },
    {
      "name": "Callum McCowatt",
      "position": "MF"
    },
    {
      "name": "Ben Old",
      "position": "MF"
    },
    {
      "name": "Alex Rufer",
      "position": "MF"
    },
    {
      "name": "Marko Stamenic",
      "position": "MF"
    },
    {
      "name": "Sarpreet Singh",
      "position": "MF"
    },
    {
      "name": "Ryan Thomas",
      "position": "MF"
    },
    {
      "name": "Kosta Barbarouses",
      "position": "FW"
    },
    {
      "name": "Jesse Randall",
      "position": "FW"
    },
    {
      "name": "Ben Waine",
      "position": "FW"
    },
    {
      "name": "Chris Wood",
      "position": "FW"
    }
  ],
  "norway": [
    {
      "name": "Orjan Haskjold Nyland",
      "position": "GK"
    },
    {
      "name": "Egil Selvik",
      "position": "GK"
    },
    {
      "name": "Sander Tangvik",
      "position": "GK"
    },
    {
      "name": "Kristoffer Vassbakk Ajer",
      "position": "DF"
    },
    {
      "name": "Fredrik Bjorkan",
      "position": "DF"
    },
    {
      "name": "Henrik Falchener",
      "position": "DF"
    },
    {
      "name": "Sondre Langas",
      "position": "DF"
    },
    {
      "name": "Torbjorn Heggem",
      "position": "DF"
    },
    {
      "name": "Marcus Holmgren Pedersen",
      "position": "DF"
    },
    {
      "name": "Julian Ryerson",
      "position": "DF"
    },
    {
      "name": "David Moller Wolfe",
      "position": "DF"
    },
    {
      "name": "Leo Ostigard",
      "position": "DF"
    },
    {
      "name": "Thelonious Aasgaard",
      "position": "MF"
    },
    {
      "name": "Fredrik Aursnes",
      "position": "MF"
    },
    {
      "name": "Patrick Berg",
      "position": "MF"
    },
    {
      "name": "Sander Berge",
      "position": "MF"
    },
    {
      "name": "Oscar Bobb",
      "position": "MF"
    },
    {
      "name": "Jens Petter Hauge",
      "position": "MF"
    },
    {
      "name": "Antonio Nusa",
      "position": "MF"
    },
    {
      "name": "Andreas Schjelderup",
      "position": "MF"
    },
    {
      "name": "Morten Thorsby",
      "position": "MF"
    },
    {
      "name": "Kristian Thorstvedt",
      "position": "MF"
    },
    {
      "name": "Martin Odegaard",
      "position": "MF"
    },
    {
      "name": "Erling Haaland",
      "position": "FW"
    },
    {
      "name": "Alexander Sorloth",
      "position": "FW"
    },
    {
      "name": "Jorgen Strand Larsen",
      "position": "FW"
    }
  ],
  "panama": [
    {
      "name": "Orlando Mosquera",
      "position": "GK"
    },
    {
      "name": "Luis Mejia",
      "position": "GK"
    },
    {
      "name": "Cesar Samudio",
      "position": "GK"
    },
    {
      "name": "Cesar Blackman",
      "position": "DF"
    },
    {
      "name": "Jorge Gutierrez",
      "position": "DF"
    },
    {
      "name": "Amir Murillo",
      "position": "DF"
    },
    {
      "name": "Fidel Escobar",
      "position": "DF"
    },
    {
      "name": "Andres Andrade",
      "position": "DF"
    },
    {
      "name": "Edgardo Farina",
      "position": "DF"
    },
    {
      "name": "Jose Cordoba",
      "position": "DF"
    },
    {
      "name": "Eric Davis",
      "position": "DF"
    },
    {
      "name": "Jiovany Ramos",
      "position": "DF"
    },
    {
      "name": "Roderick Miller",
      "position": "DF"
    },
    {
      "name": "Anibal Godoy",
      "position": "MF"
    },
    {
      "name": "Adalberto Carrasquilla",
      "position": "MF"
    },
    {
      "name": "Carlos Harvey",
      "position": "MF"
    },
    {
      "name": "Cristian Martinez",
      "position": "MF"
    },
    {
      "name": "Jose Luis Rodriguez",
      "position": "MF"
    },
    {
      "name": "Cesar Yanis",
      "position": "MF"
    },
    {
      "name": "Yoel Barcenas",
      "position": "MF"
    },
    {
      "name": "Alberto Quintero",
      "position": "MF"
    },
    {
      "name": "Azarias Londono",
      "position": "MF"
    },
    {
      "name": "Ismael Diaz",
      "position": "FW"
    },
    {
      "name": "Cecilio Waterman",
      "position": "FW"
    },
    {
      "name": "Jose Fajardo",
      "position": "FW"
    },
    {
      "name": "Tomas Rodriguez",
      "position": "FW"
    }
  ],
  "paraguay": [
    {
      "name": "Orlando Gill",
      "position": "GK"
    },
    {
      "name": "Roberto Fernandez",
      "position": "GK"
    },
    {
      "name": "Gaston Olveira",
      "position": "GK"
    },
    {
      "name": "Juan Caceres",
      "position": "DF"
    },
    {
      "name": "Gustavo Velazquez",
      "position": "DF"
    },
    {
      "name": "Gustavo Gomez",
      "position": "DF"
    },
    {
      "name": "Junior Alonso",
      "position": "DF"
    },
    {
      "name": "Jose Canale",
      "position": "DF"
    },
    {
      "name": "Omar Alderete",
      "position": "DF"
    },
    {
      "name": "Alexandro Maidana",
      "position": "DF"
    },
    {
      "name": "Fabian Balbuena",
      "position": "DF"
    },
    {
      "name": "Diego Gomez",
      "position": "MF"
    },
    {
      "name": "Mauricio Magalhaes",
      "position": "MF"
    },
    {
      "name": "Damian Bobadilla",
      "position": "MF"
    },
    {
      "name": "Braian Ojeda",
      "position": "MF"
    },
    {
      "name": "Andres Cubas",
      "position": "MF"
    },
    {
      "name": "Matias Galarza",
      "position": "MF"
    },
    {
      "name": "Alejandro Gamarra",
      "position": "MF"
    },
    {
      "name": "Gustavo Caballero",
      "position": "FW"
    },
    {
      "name": "Ramon Sosa",
      "position": "FW"
    },
    {
      "name": "Alex Arce",
      "position": "FW"
    },
    {
      "name": "Isidro Pitta",
      "position": "FW"
    },
    {
      "name": "Gabriel Avalos",
      "position": "FW"
    },
    {
      "name": "Miguel Almiron",
      "position": "FW"
    },
    {
      "name": "Julio Enciso",
      "position": "FW"
    },
    {
      "name": "Antonio Sanabria",
      "position": "FW"
    }
  ],
  "portugal": [
    {
      "name": "Diogo Costa",
      "position": "GK"
    },
    {
      "name": "Jose Sa",
      "position": "GK"
    },
    {
      "name": "Rui Silva",
      "position": "GK"
    },
    {
      "name": "Tomas Araujo",
      "position": "DF"
    },
    {
      "name": "Joao Cancelo",
      "position": "DF"
    },
    {
      "name": "Diogo Dalot",
      "position": "DF"
    },
    {
      "name": "Ruben Dias",
      "position": "DF"
    },
    {
      "name": "Goncalo Inacio",
      "position": "DF"
    },
    {
      "name": "Nuno Mendes",
      "position": "DF"
    },
    {
      "name": "Matheus Nunes",
      "position": "DF"
    },
    {
      "name": "Nelson Semedo",
      "position": "DF"
    },
    {
      "name": "Renato Veiga",
      "position": "DF"
    },
    {
      "name": "Samuel Costa",
      "position": "MF"
    },
    {
      "name": "Bruno Fernandes",
      "position": "MF"
    },
    {
      "name": "Joao Neves",
      "position": "MF"
    },
    {
      "name": "Ruben Neves",
      "position": "MF"
    },
    {
      "name": "Bernardo Silva",
      "position": "MF"
    },
    {
      "name": "Vitinha",
      "position": "MF"
    },
    {
      "name": "Francisco Conceicao",
      "position": "FW"
    },
    {
      "name": "Joao Felix",
      "position": "FW"
    },
    {
      "name": "Goncalo Guedes",
      "position": "FW"
    },
    {
      "name": "Rafael Leao",
      "position": "FW"
    },
    {
      "name": "Pedro Neto",
      "position": "FW"
    },
    {
      "name": "Goncalo Ramos",
      "position": "FW"
    },
    {
      "name": "Cristiano Ronaldo",
      "position": "FW"
    },
    {
      "name": "Francisco Trincao",
      "position": "FW"
    }
  ],
  "qatar": [
    {
      "name": "Salah Zakaria",
      "position": "GK"
    },
    {
      "name": "Meshaal Barsham",
      "position": "GK"
    },
    {
      "name": "Mahmoud Abunada",
      "position": "GK"
    },
    {
      "name": "Boualem Khoukhi",
      "position": "DF"
    },
    {
      "name": "Pedro Miguel",
      "position": "DF"
    },
    {
      "name": "Sultan Al Brake",
      "position": "DF"
    },
    {
      "name": "Al Hashmi Al Hussain",
      "position": "DF"
    },
    {
      "name": "Ayoub Al Alawi",
      "position": "DF"
    },
    {
      "name": "Issa Laye",
      "position": "DF"
    },
    {
      "name": "Lucas Mendes",
      "position": "DF"
    },
    {
      "name": "Homam Al Amin",
      "position": "DF"
    },
    {
      "name": "Ahmed Fathi",
      "position": "MF"
    },
    {
      "name": "Jassim Gaber",
      "position": "MF"
    },
    {
      "name": "Assim Madibo",
      "position": "MF"
    },
    {
      "name": "Abdulaziz Hatem",
      "position": "MF"
    },
    {
      "name": "Karim Boudiaf",
      "position": "MF"
    },
    {
      "name": "Mohammed Mannai",
      "position": "MF"
    },
    {
      "name": "Almoez Ali",
      "position": "FW"
    },
    {
      "name": "Akram Afif",
      "position": "FW"
    },
    {
      "name": "Tahsin Mohammed",
      "position": "FW"
    },
    {
      "name": "Edmilson Junior",
      "position": "FW"
    },
    {
      "name": "Ahmed Al-Janehi",
      "position": "FW"
    },
    {
      "name": "Ahmed Alaa",
      "position": "FW"
    },
    {
      "name": "Hassan Al Haydos",
      "position": "FW"
    },
    {
      "name": "Mohammed Muntari",
      "position": "FW"
    },
    {
      "name": "Yusuf Abdurisag",
      "position": "FW"
    }
  ],
  "saudi-arabia": [
    {
      "name": "Nawaf Al Aqidi",
      "position": "GK"
    },
    {
      "name": "Mohamed Al Owais",
      "position": "GK"
    },
    {
      "name": "Ahmed Alkassar",
      "position": "GK"
    },
    {
      "name": "Saud Abdulhamid",
      "position": "DF"
    },
    {
      "name": "Jehad Thakri",
      "position": "DF"
    },
    {
      "name": "Abdulelah Al Amri",
      "position": "DF"
    },
    {
      "name": "Hassan Tambakti",
      "position": "DF"
    },
    {
      "name": "Ali Lajami",
      "position": "DF"
    },
    {
      "name": "Hassan Kadesh",
      "position": "DF"
    },
    {
      "name": "Moteb Al Harbi",
      "position": "DF"
    },
    {
      "name": "Nawaf Boushal",
      "position": "DF"
    },
    {
      "name": "Ali Majrashi",
      "position": "DF"
    },
    {
      "name": "Mohammed Abu Alshamat",
      "position": "DF"
    },
    {
      "name": "Ziyad Al Johani",
      "position": "MF"
    },
    {
      "name": "Nasser Al Dawsari",
      "position": "MF"
    },
    {
      "name": "Mohamed Kanno",
      "position": "MF"
    },
    {
      "name": "Abdullah Al Khaibari",
      "position": "MF"
    },
    {
      "name": "Alaa Al Hejji",
      "position": "MF"
    },
    {
      "name": "Musab Al Juwayr",
      "position": "MF"
    },
    {
      "name": "Sultan Mandash",
      "position": "MF"
    },
    {
      "name": "Ayman Yahya",
      "position": "MF"
    },
    {
      "name": "Khalid Al Ghannam",
      "position": "MF"
    },
    {
      "name": "Salem Al Dawsari",
      "position": "FW"
    },
    {
      "name": "Abdullah Al Hamdan",
      "position": "FW"
    },
    {
      "name": "Feras Al Brikan",
      "position": "FW"
    },
    {
      "name": "Saleh Al Shehri",
      "position": "FW"
    }
  ],
  "scotland": [
    {
      "name": "Craig Gordon",
      "position": "GK"
    },
    {
      "name": "Angus Gunn",
      "position": "GK"
    },
    {
      "name": "Liam Kelly",
      "position": "GK"
    },
    {
      "name": "Grant Hanley",
      "position": "DF"
    },
    {
      "name": "Jack Hendry",
      "position": "DF"
    },
    {
      "name": "Aaron Hickey",
      "position": "DF"
    },
    {
      "name": "Dom Hyam",
      "position": "DF"
    },
    {
      "name": "Scott McKenna",
      "position": "DF"
    },
    {
      "name": "Nathan Patterson",
      "position": "DF"
    },
    {
      "name": "Anthony Ralston",
      "position": "DF"
    },
    {
      "name": "Andy Robertson",
      "position": "DF"
    },
    {
      "name": "John Souttar",
      "position": "DF"
    },
    {
      "name": "Kieran Tierney",
      "position": "DF"
    },
    {
      "name": "Ryan Christie",
      "position": "MF"
    },
    {
      "name": "Findlay Curtis",
      "position": "MF"
    },
    {
      "name": "Lewis Ferguson",
      "position": "MF"
    },
    {
      "name": "Tyler Fletcher",
      "position": "MF"
    },
    {
      "name": "Ben Gannon-Doak",
      "position": "MF"
    },
    {
      "name": "John McGinn",
      "position": "MF"
    },
    {
      "name": "Kenny McLean",
      "position": "MF"
    },
    {
      "name": "Scott McTominay",
      "position": "MF"
    },
    {
      "name": "Che Adams",
      "position": "FW"
    },
    {
      "name": "Lyndon Dykes",
      "position": "FW"
    },
    {
      "name": "George Hirst",
      "position": "FW"
    },
    {
      "name": "Lawrence Shankland",
      "position": "FW"
    },
    {
      "name": "Ross Stewart",
      "position": "FW"
    }
  ],
  "senegal": [
    {
      "name": "Edouard Mendy",
      "position": "GK"
    },
    {
      "name": "Mory Diaw",
      "position": "GK"
    },
    {
      "name": "Yehvann Diouf",
      "position": "GK"
    },
    {
      "name": "Krepin Diatta",
      "position": "DF"
    },
    {
      "name": "Antoine Mendy",
      "position": "DF"
    },
    {
      "name": "Kalidou Koulibaly",
      "position": "DF"
    },
    {
      "name": "El Hadji Malick Diouf",
      "position": "DF"
    },
    {
      "name": "Mamadou Sarr",
      "position": "DF"
    },
    {
      "name": "Moussa Niakhate",
      "position": "DF"
    },
    {
      "name": "Abdoulaye Seck",
      "position": "DF"
    },
    {
      "name": "Ismail Jakobs",
      "position": "DF"
    },
    {
      "name": "Idrissa Gana Gueye",
      "position": "MF"
    },
    {
      "name": "Pape Gueye",
      "position": "MF"
    },
    {
      "name": "Lamine Camara",
      "position": "MF"
    },
    {
      "name": "Habib Diarra",
      "position": "MF"
    },
    {
      "name": "Pathe Ciss",
      "position": "MF"
    },
    {
      "name": "Pape Matar Sarr",
      "position": "MF"
    },
    {
      "name": "Bara Sapoko Ndiaye",
      "position": "MF"
    },
    {
      "name": "Sadio Mane",
      "position": "FW"
    },
    {
      "name": "Ismaila Sarr",
      "position": "FW"
    },
    {
      "name": "Iliman Ndiaye",
      "position": "FW"
    },
    {
      "name": "Assane Diao",
      "position": "FW"
    },
    {
      "name": "Ibrahim Mbaye",
      "position": "FW"
    },
    {
      "name": "Nicolas Jackson",
      "position": "FW"
    },
    {
      "name": "Bamba Dieng",
      "position": "FW"
    },
    {
      "name": "Cherif Ndiaye",
      "position": "FW"
    }
  ],
  "south-africa": [
    {
      "name": "Ronwen Williams",
      "position": "GK"
    },
    {
      "name": "Ricardo Goss",
      "position": "GK"
    },
    {
      "name": "Sipho Chaine",
      "position": "GK"
    },
    {
      "name": "Aubrey Modiba",
      "position": "DF"
    },
    {
      "name": "Khuliso Mudau",
      "position": "DF"
    },
    {
      "name": "Khulumani Ndamane",
      "position": "DF"
    },
    {
      "name": "Kamogelo Sebelebele",
      "position": "DF"
    },
    {
      "name": "Nkosinathi Sibisi",
      "position": "DF"
    },
    {
      "name": "Bradley Cross",
      "position": "DF"
    },
    {
      "name": "Samukele Kabini",
      "position": "DF"
    },
    {
      "name": "Olwethu Makhanya",
      "position": "DF"
    },
    {
      "name": "Thabang Matuludi",
      "position": "DF"
    },
    {
      "name": "Mbekezeli Mbokazi",
      "position": "DF"
    },
    {
      "name": "Ime Okon",
      "position": "DF"
    },
    {
      "name": "Oswin Appollis",
      "position": "MF"
    },
    {
      "name": "Thalente Mbatha",
      "position": "MF"
    },
    {
      "name": "Relebohile Mofokeng",
      "position": "MF"
    },
    {
      "name": "Jayden Adams",
      "position": "MF"
    },
    {
      "name": "Teboho Mokoena",
      "position": "MF"
    },
    {
      "name": "Themba Zwane",
      "position": "MF"
    },
    {
      "name": "Sphephelo Sithole",
      "position": "MF"
    },
    {
      "name": "Evidence Makgopa",
      "position": "FW"
    },
    {
      "name": "Tshepang Moremi",
      "position": "FW"
    },
    {
      "name": "Lyle Foster",
      "position": "FW"
    },
    {
      "name": "Thapelo Maseko",
      "position": "FW"
    },
    {
      "name": "Iqraam Rayners",
      "position": "FW"
    }
  ],
  "spain": [
    {
      "name": "Unai Simon",
      "position": "GK"
    },
    {
      "name": "David Raya",
      "position": "GK"
    },
    {
      "name": "Joan Garcia",
      "position": "GK"
    },
    {
      "name": "Marc Cucurella",
      "position": "DF"
    },
    {
      "name": "Pau Cubarsi",
      "position": "DF"
    },
    {
      "name": "Aymeric Laporte",
      "position": "DF"
    },
    {
      "name": "Alejandro Grimaldo",
      "position": "DF"
    },
    {
      "name": "Pedro Porro",
      "position": "DF"
    },
    {
      "name": "Eric Garcia",
      "position": "DF"
    },
    {
      "name": "Marcos Llorente",
      "position": "DF"
    },
    {
      "name": "Marc Pubill",
      "position": "DF"
    },
    {
      "name": "Gavi",
      "position": "MF"
    },
    {
      "name": "Rodri",
      "position": "MF"
    },
    {
      "name": "Pedri",
      "position": "MF"
    },
    {
      "name": "Martin Zubimendi",
      "position": "MF"
    },
    {
      "name": "Fabian Ruiz",
      "position": "MF"
    },
    {
      "name": "Alex Baena",
      "position": "MF"
    },
    {
      "name": "Mikel Merino",
      "position": "MF"
    },
    {
      "name": "Lamine Yamal",
      "position": "FW"
    },
    {
      "name": "Nico Williams",
      "position": "FW"
    },
    {
      "name": "Dani Olmo",
      "position": "FW"
    },
    {
      "name": "Ferran Torres",
      "position": "FW"
    },
    {
      "name": "Mikel Oyarzabal",
      "position": "FW"
    },
    {
      "name": "Yeremy Pino",
      "position": "FW"
    },
    {
      "name": "Borja Iglesias",
      "position": "FW"
    },
    {
      "name": "Victor Munoz",
      "position": "FW"
    }
  ],
  "sweden": [
    {
      "name": "Viktor Johansson",
      "position": "GK"
    },
    {
      "name": "Gustaf Lagerbielke",
      "position": "GK"
    },
    {
      "name": "Kristoffer Nordfeldt",
      "position": "GK"
    },
    {
      "name": "Jacob Zetterstrom",
      "position": "GK"
    },
    {
      "name": "Hjalmar Ekdal",
      "position": "DF"
    },
    {
      "name": "Gabriel Gudmundsson",
      "position": "DF"
    },
    {
      "name": "Isak Hien",
      "position": "DF"
    },
    {
      "name": "Victor Lindelof",
      "position": "DF"
    },
    {
      "name": "Eric Smith",
      "position": "DF"
    },
    {
      "name": "Carl Starfelt",
      "position": "DF"
    },
    {
      "name": "Daniel Svensson",
      "position": "DF"
    },
    {
      "name": "Yasin Ayari",
      "position": "MF"
    },
    {
      "name": "Lucas Bergvall",
      "position": "MF"
    },
    {
      "name": "Jesper Karlstrom",
      "position": "MF"
    },
    {
      "name": "Benjamin Nygren",
      "position": "MF"
    },
    {
      "name": "Ken Sema",
      "position": "MF"
    },
    {
      "name": "Elliot Stroud",
      "position": "MF"
    },
    {
      "name": "Mattias Svanberg",
      "position": "MF"
    },
    {
      "name": "Besfort Zeneli",
      "position": "MF"
    },
    {
      "name": "Taha Ali",
      "position": "FW"
    },
    {
      "name": "Alexander Bernhardsson",
      "position": "FW"
    },
    {
      "name": "Anthony Elanga",
      "position": "FW"
    },
    {
      "name": "Viktor Gyokeres",
      "position": "FW"
    },
    {
      "name": "Alexander Isak",
      "position": "FW"
    },
    {
      "name": "Gustaf Nilsson",
      "position": "FW"
    }
  ],
  "switzerland": [
    {
      "name": "Marvin Keller",
      "position": "GK"
    },
    {
      "name": "Gregor Kobel",
      "position": "GK"
    },
    {
      "name": "Yvon Mvogo",
      "position": "GK"
    },
    {
      "name": "Manuel Akanji",
      "position": "DF"
    },
    {
      "name": "Aurele Amenda",
      "position": "DF"
    },
    {
      "name": "Eray Comert",
      "position": "DF"
    },
    {
      "name": "Nico Elvedi",
      "position": "DF"
    },
    {
      "name": "Luca Jaquez",
      "position": "DF"
    },
    {
      "name": "Miro Muheim",
      "position": "DF"
    },
    {
      "name": "Ricardo Rodriguez",
      "position": "DF"
    },
    {
      "name": "Silvan Widmer",
      "position": "DF"
    },
    {
      "name": "Michel Aebischer",
      "position": "MF"
    },
    {
      "name": "Christian Fassnacht",
      "position": "MF"
    },
    {
      "name": "Remo Freuler",
      "position": "MF"
    },
    {
      "name": "Ardon Jashari",
      "position": "MF"
    },
    {
      "name": "Fabian Rieder",
      "position": "MF"
    },
    {
      "name": "Djibril Sow",
      "position": "MF"
    },
    {
      "name": "Cedric Itten",
      "position": "MF"
    },
    {
      "name": "Granit Xhaka",
      "position": "MF"
    },
    {
      "name": "Denis Zakaria",
      "position": "MF"
    },
    {
      "name": "Ruben Vargas",
      "position": "FW"
    },
    {
      "name": "Zeki Amdouni",
      "position": "FW"
    },
    {
      "name": "Breel Embolo",
      "position": "FW"
    },
    {
      "name": "Dan Ndoye",
      "position": "FW"
    },
    {
      "name": "Noah Okafor",
      "position": "FW"
    },
    {
      "name": "Johan Manzambi",
      "position": "FW"
    }
  ],
  "tunisia": [
    {
      "name": "Sabri Ben Hessen",
      "position": "GK"
    },
    {
      "name": "Abdelmouhib Chamakh",
      "position": "GK"
    },
    {
      "name": "Aymen Dahman",
      "position": "GK"
    },
    {
      "name": "Ali Abdi",
      "position": "DF"
    },
    {
      "name": "Adem Arous",
      "position": "DF"
    },
    {
      "name": "Mohamed Amine Ben Hamida",
      "position": "DF"
    },
    {
      "name": "Dylan Bronn",
      "position": "DF"
    },
    {
      "name": "Raed Chikhaoui",
      "position": "DF"
    },
    {
      "name": "Moutaz Neffati",
      "position": "DF"
    },
    {
      "name": "Omar Rekik",
      "position": "DF"
    },
    {
      "name": "Montassar Talbi",
      "position": "DF"
    },
    {
      "name": "Yan Valery",
      "position": "DF"
    },
    {
      "name": "Mortadha Ben Ouanes",
      "position": "MF"
    },
    {
      "name": "Anis Ben Slimane",
      "position": "MF"
    },
    {
      "name": "Ismael Gharbi",
      "position": "MF"
    },
    {
      "name": "Rani Khedira",
      "position": "MF"
    },
    {
      "name": "Mohamed Hadj Mahmoud",
      "position": "MF"
    },
    {
      "name": "Hannibal Mejbri",
      "position": "MF"
    },
    {
      "name": "Ellyes Skhiri",
      "position": "MF"
    },
    {
      "name": "Elias Achouri",
      "position": "FW"
    },
    {
      "name": "Khalil Ayari",
      "position": "FW"
    },
    {
      "name": "Firas Chaouat",
      "position": "FW"
    },
    {
      "name": "Rayan Elloumi",
      "position": "FW"
    },
    {
      "name": "Hazem Mastouri",
      "position": "FW"
    },
    {
      "name": "Elias Saad",
      "position": "FW"
    },
    {
      "name": "Sebastian Tounekti",
      "position": "FW"
    }
  ],
  "turkiye": [
    {
      "name": "Altay Bayindir",
      "position": "GK"
    },
    {
      "name": "Mert Gunok",
      "position": "GK"
    },
    {
      "name": "Ugurcan Cakir",
      "position": "GK"
    },
    {
      "name": "Abdulkerim Bardakci",
      "position": "DF"
    },
    {
      "name": "Caglar Soyuncu",
      "position": "DF"
    },
    {
      "name": "Eren Elmali",
      "position": "DF"
    },
    {
      "name": "Ferdi Kadioglu",
      "position": "DF"
    },
    {
      "name": "Merih Demiral",
      "position": "DF"
    },
    {
      "name": "Mert Muldur",
      "position": "DF"
    },
    {
      "name": "Ozan Kabak",
      "position": "DF"
    },
    {
      "name": "Samet Akaydin",
      "position": "DF"
    },
    {
      "name": "Zeki Celik",
      "position": "DF"
    },
    {
      "name": "Hakan Calhanoglu",
      "position": "MF"
    },
    {
      "name": "Ismail Yuksek",
      "position": "MF"
    },
    {
      "name": "Kaan Ayhan",
      "position": "MF"
    },
    {
      "name": "Orkun Kokcu",
      "position": "MF"
    },
    {
      "name": "Salih Ozcan",
      "position": "MF"
    },
    {
      "name": "Arda Guler",
      "position": "FW"
    },
    {
      "name": "Baris Alper Yilmaz",
      "position": "FW"
    },
    {
      "name": "Can Uzun",
      "position": "FW"
    },
    {
      "name": "Deniz Gul",
      "position": "FW"
    },
    {
      "name": "Irfan Can Kahveci",
      "position": "FW"
    },
    {
      "name": "Kenan Yildiz",
      "position": "FW"
    },
    {
      "name": "Kerem Akturkoglu",
      "position": "FW"
    },
    {
      "name": "Oguz Aydin",
      "position": "FW"
    },
    {
      "name": "Yunus Akgun",
      "position": "FW"
    }
  ],
  "uruguay": [
    {
      "name": "Sergio Rochet",
      "position": "GK"
    },
    {
      "name": "Fernando Muslera",
      "position": "GK"
    },
    {
      "name": "Santiago Mele",
      "position": "GK"
    },
    {
      "name": "Guillermo Varela",
      "position": "DF"
    },
    {
      "name": "Ronald Araujo",
      "position": "DF"
    },
    {
      "name": "Jose Maria Gimenez",
      "position": "DF"
    },
    {
      "name": "Santiago Bueno",
      "position": "DF"
    },
    {
      "name": "Sebastian Caceres",
      "position": "DF"
    },
    {
      "name": "Mathias Olivera",
      "position": "DF"
    },
    {
      "name": "Joaquin Piquerez",
      "position": "DF"
    },
    {
      "name": "Matias Vina",
      "position": "DF"
    },
    {
      "name": "Maximiliano Araujo",
      "position": "MF"
    },
    {
      "name": "Giorgian de Arrascaeta",
      "position": "MF"
    },
    {
      "name": "Rodrigo Bentancur",
      "position": "MF"
    },
    {
      "name": "Agustin Canobbio",
      "position": "MF"
    },
    {
      "name": "Nicolas de la Cruz",
      "position": "MF"
    },
    {
      "name": "Emiliano Martinez",
      "position": "MF"
    },
    {
      "name": "Facundo Pellistri",
      "position": "MF"
    },
    {
      "name": "Brian Rodriguez",
      "position": "MF"
    },
    {
      "name": "Juan Manuel Sanabria",
      "position": "MF"
    },
    {
      "name": "Manuel Ugarte",
      "position": "MF"
    },
    {
      "name": "Federico Valverde",
      "position": "MF"
    },
    {
      "name": "Rodrigo Zalazar",
      "position": "MF"
    },
    {
      "name": "Rodrigo Aguirre",
      "position": "FW"
    },
    {
      "name": "Federico Vinas",
      "position": "FW"
    },
    {
      "name": "Darwin Nunez",
      "position": "FW"
    }
  ],
  "usa": [
    {
      "name": "Chris Brady",
      "position": "GK"
    },
    {
      "name": "Matt Freese",
      "position": "GK"
    },
    {
      "name": "Matt Turner",
      "position": "GK"
    },
    {
      "name": "Max Arfsten",
      "position": "DF"
    },
    {
      "name": "Sergino Dest",
      "position": "DF"
    },
    {
      "name": "Alex Freeman",
      "position": "DF"
    },
    {
      "name": "Mark McKenzie",
      "position": "DF"
    },
    {
      "name": "Tim Ream",
      "position": "DF"
    },
    {
      "name": "Chris Richards",
      "position": "DF"
    },
    {
      "name": "Antonee Robinson",
      "position": "DF"
    },
    {
      "name": "Miles Robinson",
      "position": "DF"
    },
    {
      "name": "Joe Scally",
      "position": "DF"
    },
    {
      "name": "Auston Trusty",
      "position": "DF"
    },
    {
      "name": "Tyler Adams",
      "position": "MF"
    },
    {
      "name": "Sebastian Berhalter",
      "position": "MF"
    },
    {
      "name": "Weston McKennie",
      "position": "MF"
    },
    {
      "name": "Cristian Roldan",
      "position": "MF"
    },
    {
      "name": "Brenden Aaronson",
      "position": "MF"
    },
    {
      "name": "Christian Pulisic",
      "position": "MF"
    },
    {
      "name": "Gio Reyna",
      "position": "MF"
    },
    {
      "name": "Malik Tillman",
      "position": "MF"
    },
    {
      "name": "Tim Weah",
      "position": "MF"
    },
    {
      "name": "Alejandro Zendejas",
      "position": "MF"
    },
    {
      "name": "Folarin Balogun",
      "position": "FW"
    },
    {
      "name": "Ricardo Pepi",
      "position": "FW"
    },
    {
      "name": "Haji Wright",
      "position": "FW"
    }
  ],
  "uzbekistan": [
    {
      "name": "Botirali Ergashev",
      "position": "GK"
    },
    {
      "name": "Abduvohid Nematov",
      "position": "GK"
    },
    {
      "name": "Utkir Yusupov",
      "position": "GK"
    },
    {
      "name": "Abdukodir Khusanov",
      "position": "DF"
    },
    {
      "name": "Khojiakbar Alijonov",
      "position": "DF"
    },
    {
      "name": "Rustamjon Ashurmatov",
      "position": "DF"
    },
    {
      "name": "Farrukh Sayfiev",
      "position": "DF"
    },
    {
      "name": "Sherzod Nasrullaev",
      "position": "DF"
    },
    {
      "name": "Umarbek Eshmuradov",
      "position": "DF"
    },
    {
      "name": "Avazbek Ulmasaliev",
      "position": "DF"
    },
    {
      "name": "Jakhongir Urozov",
      "position": "DF"
    },
    {
      "name": "Bekhruz Karimov",
      "position": "DF"
    },
    {
      "name": "Abdulla Abdullaev",
      "position": "DF"
    },
    {
      "name": "Akmal Mozgovoy",
      "position": "MF"
    },
    {
      "name": "Otabek Shukurov",
      "position": "MF"
    },
    {
      "name": "Jamshid Iskanderov",
      "position": "MF"
    },
    {
      "name": "Odiljon Hamrobekov",
      "position": "MF"
    },
    {
      "name": "Jaloliddin Masharipov",
      "position": "MF"
    },
    {
      "name": "Azizbek Ganiev",
      "position": "MF"
    },
    {
      "name": "Sherzod Esanov",
      "position": "MF"
    },
    {
      "name": "Abbosbek Fayzullaev",
      "position": "MF"
    },
    {
      "name": "Azizbek Amonov",
      "position": "FW"
    },
    {
      "name": "Eldor Shomurodov",
      "position": "FW"
    },
    {
      "name": "Igor Sergeev",
      "position": "FW"
    },
    {
      "name": "Oston Urunov",
      "position": "FW"
    },
    {
      "name": "Dostonbek Hamdamov",
      "position": "FW"
    }
  ]
} satisfies Record<string, SquadPlayer[]>

export const squads: Record<string, SquadPlayer[]> = squadData

export const squadWarnings = [
  "canada 25",
  "sweden 25"
]
