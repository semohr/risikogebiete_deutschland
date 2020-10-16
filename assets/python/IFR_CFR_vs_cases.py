import sys
import pandas as pd
import numpy as np
import datetime

sys.path.append("../toolbox/master")
import covid19_inference as cov19

rki = cov19.data_retrieval.RKI(True)

# Population by landkreis
sys.path.append("../SurvStat_RKI/")
from Landkreise import Landkreise

lkr = Landkreise("../SurvStat_RKI/risklayer_kreise.csv")
data = rki.data
data = data.set_index(
    [
        "Landkreis",
        "IdLandkreis",
        "Altersgruppe",
        "date",
        "date_ref",
        "Bundesland",
        "IdBundesland",
    ]
)
data = data.drop(columns=["Altersgruppe2", "FID", "Datenstand", "Geschlecht"])
data = data["confirmed"]  # Ist Erkrankungsbegin?

population = pd.read_csv("population.csv")
population = population.set_index("age")


# IFR
def f(a):
    if a <= 100:
        return 0.1 * 10 ** (1 / 20 * (a - 82))
    else:
        return 0.6


def inzidenz_per_lk():
    """
    Get inzidenz per Landkreis and age group

    """
    # Cet data with landkreis columns
    data_l = pd.DataFrame()
    for landkreis in data.index.get_level_values("Landkreis").unique():
        data_l[landkreis] = (
            data.xs(landkreis, level="Landkreis")
            .groupby(["Altersgruppe", "date"])
            .sum()
        )

    # Expand so each day is in the data and fill nans with 0
    data_l = data_l.groupby(level=0).apply(
        lambda x: x.reset_index(level=0, drop=True).asfreq("D")
    )
    data_l = data_l.fillna(0)

    level_values = data_l.index.get_level_values
    data_l = data_l.groupby(
        [level_values(i) for i in [0,]] + [pd.Grouper(freq="W-Sun", level="date")]
    ).sum()

    # Calculate inzidenz per 100.000
    inzidenz = pd.DataFrame()
    for landkreis in data_l.columns:
        # get id by name
        for key, value in lkr.lkrNames.items():
            if value == landkreis:
                inzidenz[landkreis] = 100000 * data_l[landkreis] / lkr.lkrN[key]
                continue
            if landkreis == "LK Göttingen (alt)":  # Expetion
                inzidenz[landkreis] = 100000 * data_l[landkreis] / lkr.lkrN[3159]
                continue
    # Weight with age groups
    for age in inzidenz.index.get_level_values(level="Altersgruppe").unique():
        if age == "A00-A04":
            factor = (population[0 : 4 + 1].sum() / population.sum()).values[0]
        elif age == "A05-A14":
            factor = (population[5 : 14 + 1].sum() / population.sum()).values[0]
        elif age == "A15-A34":
            factor = (population[15 : 34 + 1].sum() / population.sum()).values[0]
        elif age == "A35-A59":
            factor = (population[35 : 59 + 1].sum() / population.sum()).values[0]
        elif age == "A60-A79":
            factor = (population[60 : 79 + 1].sum() / population.sum()).values[0]
        elif age == "A80+":
            factor = (population[80:].sum() / population.sum()).values[0]

        inzidenz[age:age] = inzidenz[age:age] / factor

    return inzidenz
