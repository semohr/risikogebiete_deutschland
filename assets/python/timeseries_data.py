import pandas as pd
import covid19_inference as cov19
import numpy as np
import json
from datetime import date,timedelta



# Load data with covid19inference module
rki = cov19.data_retrieval.RKI()
rki.download_all_available_data()

# Load population data
population = pd.read_csv("../data/population_rki_age_groups.csv", encoding="cp1252",)
population = population.dropna()
population["ags"] = population["ags"].astype(int)
pop_rki_aligned = population.set_index(["ags", "Region", "NUTS3"])

# Placeholder for unknown data, fyi: we are not using it
pop_rki_aligned["unbekannt"] = pop_rki_aligned.sum(axis=1) * 0.01  # 1% not known
pop_rki_aligned["total"] = pop_rki_aligned.sum(axis=1)


# Get raw data from retriever
data_rki = rki.data

# Last date in dataset
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


""" Some strange exceptions
- Add all landkreise for berlin together
- Add total cases columns
"""
berlin_ags = [
    11001,
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
berlin = cases_7_day_sum.loc[berlin_ags,:,:].groupby(["date","Altersgruppe"]).sum()
berlin = berlin.reset_index()
berlin["IdLandkreis"] = 11000
berlin_total = berlin.groupby(["date","IdLandkreis"]).sum().reset_index()
berlin_total["Altersgruppe"] = "total"

total = cases_7_day_sum.groupby(["date","IdLandkreis"]).sum()
total = total.reset_index()
total["Altersgruppe"] = "total"
total = total.append(berlin_total)

cases = cases_7_day_sum.reset_index()
cases = cases.append(berlin)
cases = cases.append(total)

for id in berlin_ags:
    cases = cases[cases["IdLandkreis"] != id]

cases = cases.set_index(["date", "IdLandkreis", "Altersgruppe"])
cases = cases.sort_index()

""" # Calculate age dependent incidence
For efficiency reasons we use apply and groupby here, iterating all rows
would take forever
"""
def map_func(a):
    # Get age group and landkreisid from index
    ags = a.index[0][1]
    age_group = a.index[0][2]
    if ags == 2000:
        ags = 2
    # calc incidence per 100000
    return a / pop_rki_aligned.xs(ags, level="ags")[age_group][0]*100000
data = cases.groupby(["IdLandkreis","Altersgruppe"]).apply(func=map_func) # Apply function onto each row

data = data.rename(columns={"confirmed":"inzidenz"})
data["weekly_cases"]=cases["confirmed"]
data = data.sort_index()

""" Select last 16 weeks
"""
end =  date.today()
begin = end-timedelta(days=7*16)

data = data.loc[begin:end,:,:]



""" write as compressed hdf5
"""
import h5py
data=data.reset_index()
data["date"] = data.apply(lambda row: row["date"].timestamp(), axis=1)
data["IdLandkreis"] = data.apply(lambda row: row["IdLandkreis"], axis=1)
data["weekly_cases"] = data.apply(lambda row: int(row["weekly_cases"]), axis=1)

index = { x: dict(zip(map(int,data[x].unique()),range(len(data[x].unique())))) for x in ("date","IdLandkreis")}
index["Altersgruppe"] = dict(zip(map(str,data["Altersgruppe"].unique()),range(len(data["Altersgruppe"].unique()))))

cases = np.full((len(index["date"]),len(index["IdLandkreis"]),len(index["Altersgruppe"])),-1)
incidence = np.full((len(index["date"]),len(index["IdLandkreis"]),len(index["Altersgruppe"])),-1.0)

def get_index(date,IdLandkreis,Altersgruppe):
    return (index["date"][date],index["IdLandkreis"][IdLandkreis],index["Altersgruppe"][Altersgruppe])


for r in data.iterrows():
    row = r[1]
    idx = get_index(row["date"],row["IdLandkreis"],row["Altersgruppe"])
    cases[idx]=row["weekly_cases"]
    incidence[idx]=row["inzidenz"]

with h5py.File("../data/timeseries_nd.hdf5", 'w') as f:
    f.create_dataset(f"data/incidence", data=incidence, compression="gzip", compression_opts=9)
    f.create_dataset(f"data/weekly_cases", data=cases, compression="gzip", compression_opts=9)

with open('../data/array_index.json', 'w') as f:
    f.write(json.dumps(index))
