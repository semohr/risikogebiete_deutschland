# ------------------------------------------------------------------------------ #
# Creates the
# @Author:        Sebastian B. Mohr
# @Email:
# @Created:       2020-10-15 14:08:49
# @Last Modified: 2021-04-15 15:37:34
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
    "../data/population_rki_age_groups.csv", encoding="cp1252",
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

pop_rki_aligned = population.set_index(["ags", "Region", "NUTS3"])

# Raw geo_file
with open("../data/population_landkreise.json") as json_file:
    population_landkreise = ujson.load(json_file)

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

    if lk_id == 5354:
        continue

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
                / (
                    pop_rki_aligned.sum()[ag]
                    / pop_rki_aligned.sum().sum()
                    * population_landkreise[str(lk_id)]
                )
            )

# Write file
with open("../data/data_latest.json", "w") as outfile:
    ujson.dump(data, outfile)

# Additionally write csv
df = pd.read_json(open("../data/data_latest.json", "r"))
df = df.T
df.index.name = "Landreis ID"
df.to_csv("../data/data_latest.csv")
