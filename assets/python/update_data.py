# ------------------------------------------------------------------------------ #
# Creates the
# @Author:        Sebastian B. Mohr
# @Email:
# @Created:       2020-10-15 14:08:49
# @Last Modified: 2020-10-16 21:26:16
# ------------------------------------------------------------------------------ #
import ujson
import pandas as pd
import covid19_inference as cov19
import numpy as np

""" # Load data
"""

# Load data with cov19npis module
rki = cov19.data_retrieval.RKI()
rki.download_all_available_data(force_download=True)


# Load population data
population = pd.read_csv(
    "../data/population_landkreise_altersgruppen.csv", encoding="cp1252",
)
# FORMAT BS Should not be neccesary anymore:
"""
population = population.dropna()
population = population.drop(columns="date")
# Convert ags col to string
population["ags"] = population["ags"].apply(
    lambda x: "0" + str(int(x)) if len(str(int(x))) == 4 else str(int(x)),
)


for col in population.columns:
    population[col] = population[col].map(lambda x: x.strip("+-"))
    population[col].replace("", np.nan, inplace=True)
    population = population.dropna()
    population[col] = population[col].astype(int)
"""

population = population.set_index(["ags", "region", "typ"])

# Raw geo_file
with open("../data/population_landkreise.json") as json_file:
    population_landkreise = ujson.load(json_file)


""" # Maniuplate data
"""

# Get the same age groups as for the rki database:
pop_rki_aligned = pd.DataFrame()

pop_rki_aligned["A00-A04"] = (
    population["unter 3 Jahre"] + population["3 bis unter 6 Jahre"]
)
pop_rki_aligned["A05-A14"] = (
    population["6 bis unter 10 Jahre"] + population["10 bis unter 15 Jahre"]
)
pop_rki_aligned["A15-A34"] = (
    population["15 bis unter 18 Jahre"]
    + population["18 bis unter 20 Jahre"]
    + population["20 bis unter 25 Jahre"]
    + population["25 bis unter 30 Jahre"]
    + population["30 bis unter 35 Jahre"]
)
pop_rki_aligned["A35-A59"] = (
    population["35 bis unter 40 Jahre"]
    + population["40 bis unter 45 Jahre"]
    + population["45 bis unter 50 Jahre"]
    + population["50 bis unter 55 Jahre"]
    + population["55 bis unter 60 Jahre"]
)  # Ratio in population
pop_rki_aligned["A60-A79"] = (
    population["60 bis unter 65 Jahre"] + population["65 bis unter 75 Jahre"]
)
pop_rki_aligned["A80+"] = population["75 Jahre und mehr"]
pop_rki_aligned["unbekannt"] = pop_rki_aligned.sum(axis=1) * 0.01  # 1% not known

# New cases with rolling 7 day sum:
data_rki = rki.data
date = rki.data["date"].max()
index = pd.date_range(rki.data["date"].min(), rki.data["date"].max())

data_rki = data_rki.set_index(["IdLandkreis", "Altersgruppe", "date",])
data_rki = data_rki.groupby(["IdLandkreis", "Altersgruppe", "date",]).sum()["confirmed"]
data_rki = data_rki.groupby(level=[0, 1]).apply(
    lambda x: x.reset_index(level=[0, 1], drop=True).reindex(index)
)
data_rki.index = data_rki.index.set_names("date", level=-1)
data_rki = data_rki.fillna(0)

cases_7_day_sum = data_rki.rolling(7).sum()

# We want to store the LAST number of weekly new cases
data_cases = cases_7_day_sum.xs(date, level="date")


""" # Create data dict
    [IDLandkreis, [cases,incidenc]]
"""
data = {}
for lk_id in data_cases.index.get_level_values(level="IdLandkreis").unique():
    data_lk = data_cases.xs(lk_id, level="IdLandkreis")

    # BERLIN
    berlin = [
        11002,
        11003,
        11004,
        11005,
        11006,
        11007,
        11008,
        11009,
        11010,
        11011,
        11012,
    ]
    if lk_id in berlin:
        continue

    if lk_id == 11001:
        data_lk = data_cases.xs(lk_id, level="IdLandkreis")
        for id_b in berlin:
            data_lk += (
                data_cases.xs(id_b, level="IdLandkreis")
                .reindex(data_lk.index)
                .fillna(0)
            )
        lk_id = 11000

    # Normal
    data[lk_id] = {}
    data[lk_id]["weekly_cases"] = data_lk.sum()

    try:
        data[lk_id]["inzidenz"] = (
            data[lk_id]["weekly_cases"]
            * 100000
            / population["Insgesamt"].xs(lk_id, level="ags").values[0]
        )
    except:
        data[lk_id]["inzidenz"] = (
            data[lk_id]["weekly_cases"] * 100000 / population_landkreise[str(lk_id)]
        )

    # Age groups
    for ag in data_lk.index:
        data[lk_id][f"weekly_cases_{ag}"] = data_lk[ag]
        try:
            data[lk_id][f"inzidenz_{ag}"] = (
                data_lk[ag]
                * 100000
                / pop_rki_aligned[ag].xs(lk_id, level="ags").values[0]
            )
        except:
            data[lk_id][f"inzidenz_{ag}"] = (
                data_lk[ag]
                * 100000
                / (pop_rki_aligned.sum()[ag] / pop_rki_aligned.sum().sum())
                * population_landkreise[str(lk_id)]
            )


# Write file
with open("../data/data_latest.json", "w") as outfile:
    ujson.dump(data, outfile)
