import pandas as pd
import covid19_inference as cov19
import numpy as np
import json
from datetime import date,timedelta



# Load data with covid19inference module
rki = cov19.data_retrieval.RKI()
rki.url_csv="https://ago-item-storage.s3.us-east-1.amazonaws.com/f10774f1c63e40168479a1feb6c7ca74/RKI_COVID19.csv?X-Amz-Security-Token=IQoJb3JpZ2luX2VjEHwaCXVzLWVhc3QtMSJIMEYCIQC0Y7DgvtH5puSY6D%2BgqUwX0bAKXg6cfmuDuaqgGZv3BQIhAI6xKi5W4J5M%2BtLdle4Z5whRiJicje2Kq8NtTAHYuX1xKoMECPX%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjA0NzU4MTAyNjY1IgwjUeb4YJzlJaQMMOwq1wNs61woJVKIteYK5XPXJ2Bv3e1FYOLpYi7x05kMXECUo7f2ABeASgYXeBm0N9%2FstD2uELQUlTMeZLuvjX3ftm2g9SQjz1HqcQxLC60oAKEDGt0B4j8%2BVmMhaBIq%2FW0NA7VsTritIZMeN0x1Nh6BnNQDhCh3mMptE1mLS2uim39QDkdyyDvIN%2B3UT7aNoNoxacp8Ey55sF2a2gKy75H0DONE90B%2BNZCRUzjEietdHs0bV3653pN%2BU8IRKaO%2Fu2iWgbWIAnOYfn4nZG0XwEwcGYF2eHcFfATXqyET2GsPbElRFF75fiKUYpXWrP9nsLkuVAfaUQlBARDgN078N1%2BYwmOwaV26sl%2FJwS8xeQ2XXPzZ5%2Fy%2FgpRvdX%2FEdkHjO3xNG%2BC58%2Fw0dOCdioyzJv2Xe3DpvEH057ItYAqsEDScbHOnTDzf1jYFxv9vezBFneDEJ8wylewQ7k10Sb8z9v7bDPo3a4TexFX8597RRPPQixwX5syB4vgbqS51tHMYGpAvg0uBG%2FHv3Zjkdw8eAJ7X8udB73LlRRWLzEOlgbjz88LdKQ%2BWsq%2Bv7pMRwo%2Bwo3U07%2Fpl%2BNErV8Jd6Alcy1x25R6O%2ButCmCd%2BEeEGFyCupsNqCM60aBg%2FKTEw1I3ekQY6pAFfVr1cXcROVmj4QvdTZ4Ea7ygaD15287%2BqCumYjm%2Bb57aMN8uAWLdpCRJpMWxxZxND2HYeILTxMxjyignwA9rQKe9sieyJFrHjM%2FwiHOPcfODlnJWPbSuDvoi0nyVAyXlVNffyT%2FTWRC1xHDASFCTT%2BP9paDmK1q99APOBS4XddB3RKjxHTgd3bEoGCGZNNjw4UPgoxFX4W%2FBISd4ySv47ACiiog%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20220320T205738Z&X-Amz-SignedHeaders=host&X-Amz-Expires=300&X-Amz-Credential=ASIAYZTTEKKER5USKX2I%2F20220320%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=042a0e13fed2bf1e5495e603f224cdcbbaad47dcb35b96890a899a7d6d1e833f"
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
