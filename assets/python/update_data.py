# ------------------------------------------------------------------------------ #
# @Author:        Sebastian B. Mohr
# @Email:
# @Created:       2020-10-15 14:08:49
# @Last Modified: 2020-10-16 17:17:46
# ------------------------------------------------------------------------------ #
import json
import pandas as pd
import covid19_inference as cov19


""" # Load data
"""

# Load data with cov19npis module
rki = cov19.data_retrieval.RKI()
rki.download_all_available_data(force_download=True)


# Load population data
population = pd.read_csv("../data/population.csv")
population = population.set_index("age")


# Load alternative names for rki database
with open("../data/alternative_names.json") as json_file:
    alternatives = json.load(json_file)


# Raw geo_file
with open("../data/landkreise_simplify200.geojson") as json_file:
    data = json.load(json_file)


""" # Maniuplate data
"""
# Ratio in population
factor = {}
factor["A00-A04"] = (population[0 : 4 + 1].sum() / population.sum()).values[0]
factor["A05-A14"] = (population[5 : 14 + 1].sum() / population.sum()).values[0]
factor["A15-A34"] = (population[15 : 34 + 1].sum() / population.sum()).values[0]
factor["A35-A59"] = (population[35 : 59 + 1].sum() / population.sum()).values[0]
factor["A60-A79"] = (population[60 : 79 + 1].sum() / population.sum()).values[0]
factor["A80+"] = (population[80:].sum() / population.sum()).values[0]
factor["unbekannt"] = 0.05  # approx 5% of pop no age data

# New cases
date = rki.data["date"].max()
index = pd.date_range(rki.data["date"].min(), rki.data["date"].max())

data_rki = rki.data
data_rki = data_rki.set_index(["Landkreis", "Altersgruppe", "date",])
data_rki = data_rki.groupby(["Landkreis", "Altersgruppe", "date",]).sum()["confirmed"]
data_rki = data_rki.groupby(level=[0, 1]).apply(
    lambda x: x.reset_index(level=[0, 1], drop=True).reindex(index)
)
data_rki.index = data_rki.index.set_names("date", level=-1)
data_rki = data_rki.fillna(0)
inzidenz = data_rki.rolling(7).sum()


def color_scheme(number):
    if number >= 50.0:
        return "#e50000"  # red
    elif number < 50.0 and number > 25.0:
        return "#fac205"  # goldenrod
    else:
        return "#15b01a"  # green


def add_data(prop, rki_name):
    """
    Adds data to the geojson file in the properties dict
    """
    if rki_name == "Berlin":
        berlin_list = [
            "SK Berlin Charlottenburg-Wilmersdorf",
            "SK Berlin Friedrichshain-Kreuzberg",
            "SK Berlin Lichtenberg",
            "SK Berlin Marzahn-Hellersdorf",
            "SK Berlin Mitte",
            "SK Berlin Neukölln",
            "SK Berlin Pankow",
            "SK Berlin Reinickendorf",
            "SK Berlin Spandau",
            "SK Berlin Steglitz-Zehlendorf",
            "SK Berlin Tempelhof-Schöneberg",
            "SK Berlin Treptow-Köpenick",
        ]
        # Total
        prop["weekly_cases"] = 0
        for b in berlin_list:
            prop["weekly_cases"] += inzidenz[b].groupby("date").sum()[-1]

        prop["weekly_inzidenz"] = (
            prop["weekly_cases"] * 100000 / prop["destatis"]["population"]
        )
        prop["fill"] = color_scheme(prop["weekly_inzidenz"])

        # Age_groups
        for age_group in inzidenz[b].index.get_level_values("Altersgruppe").unique():
            prop[f"weekly_cases_{age_group}"] = 0
            for b in berlin_list:
                prop[f"weekly_cases_{age_group}"] += inzidenz[b][age_group][-1]

            prop[f"weekly_inzidenz_{age_group}"] = (
                prop[f"weekly_cases_{age_group}"]
                * 100000
                / (prop["destatis"]["population"] * factor[age_group])
            )

            prop[f"fill_{age_group}"] = "red"
        return

    ###################################################
    # START
    ###################################################
    # Total
    prop["weekly_cases"] = inzidenz[rki_name].groupby("date").sum()[-1]
    prop["weekly_inzidenz"] = (
        inzidenz[rki_name].groupby("date").sum()[-1]
        * 100000
        / prop["destatis"]["population"]
    )

    prop["fill"] = color_scheme(prop["weekly_inzidenz"])

    # Age groups
    for age_group in inzidenz[rki_name].index.get_level_values("Altersgruppe").unique():
        prop[f"weekly_cases_{age_group}"] = inzidenz[rki_name][age_group][-1]
        prop[f"weekly_inzidenz_{age_group}"] = (
            inzidenz[rki_name][age_group][-1]
            * 100000
            / (prop["destatis"]["population"] * factor[age_group])
        )
        # prop[f"fill_{age_group}"] = color_scheme(prop[f"weekly_inzidenz_{age_group}"])
        prop[f"fill_{age_group}"] = "red"


# Iterate over every entry in the geojson file
id_to_name = {}
for i, entry in enumerate(data["features"]):
    prop = entry["properties"]

    # Get type of entry and construct rki db name
    name = prop["GEN"]
    if prop["BEZ"] == "Landkreis":
        prefix = "LK"
    elif prop["BEZ"] == "Kreis":
        prefix = "LK"
    elif prop["BEZ"] == "Kreisfreie Stadt":
        prefix = "SK"
    elif prop["BEZ"] == "Stadtkreis":
        prefix = "SK"
    else:
        raise ValueError(f"Not found {prop['GEN']}")

    if name in alternatives:
        name = alternatives[name]

    # Default case
    rki_name = f"{prefix} {name}"

    # Additional cases
    if name == "Berlin":
        add_data(prop, name)
    elif name == "StadtRegion Aachen":
        add_data(prop, name)
    elif name == "Region Hannover":
        add_data(prop, name)
    else:
        add_data(prop, rki_name)

    # Delete some props to clean space
    ls_del = [
        "ADE",
        "GF",
        "BSG",
        "RS",
        "SDV_RS",
        "IBZ",
        "BEM",
        "NBD",
        "SN_L",
        "SN_R",
        "SN_K",
        "SN_V1",
        "SN_V2",
        "SN_G",
        "FK_S3",
        "NUTS",
        "RS_0",
        "AGS_0",
        "WSK",
    ]
    for key in ls_del:
        del prop[key]

    # IDS for amChart
    prop["id"] = prop["AGS"]  # amtlicher gemeindeschlüssel
    id_to_name[i] = name


# Write file
with open("../data/data_latest.geo.json", "w", encoding="utf-8") as outfile:
    json.dump(data, outfile)
