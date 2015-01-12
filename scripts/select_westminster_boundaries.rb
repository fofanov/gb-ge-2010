require 'csv'

WESTMINSTER_AREA_CODE = "WMC"
NON_KEYWORDS = ["of","and","the","upon","under"]
CSV_2010_RESULT_HEADERS = ["ADMIN_UNIT_ID", "NAME", "PARTY", "MAJORITY", "TURNOUT"]
TOTAL_NORTHERN_IRELAND_CONSTITUENCIES = 18
TOTAL_GREAT_BRITAIN_CONSTITUENCIES = 632

wmc_admin_units = {}

#Create an identifier from a boundary name in a consistent way so that
#we can match openspace data with the election result data.
def make_id_from_boundary_name(name)
    #Split hyphenated names.
    keywords = name.split(/[ -]/)
    #Downcase and remove punctuation.
    keywords.map! { |w| w.downcase.gsub(/[,.]/,'') }
    #Remove non-keywords
    keywords.reject!{ |w| NON_KEYWORDS.include?(w) }
    #Sort keywords
    keywords.sort!{ |x,y| x <=> y }
    keywords.hash
end

CSV.foreach("data/OpenSpace_Boundaries_Lookup1.csv", headers:true) do |row|
    if row["AREA_CODE"] == WESTMINSTER_AREA_CODE

        #Clean up names, remove double quotes.
        row["NAME"].gsub!(/"/,'')
        #Strip mentions of Co Const & Boro Const & Burgh Const to match up with election result data.
        row["NAME"].gsub!(/ (Co|Boro|Burgh) .*/,'')

        wmc_id = make_id_from_boundary_name(row["NAME"])
        wmc_admin_units[wmc_id] = {:name => row["NAME"],
                                   :admin_unit_id => row["ADMIN_UNIT_ID"]}
    end
end

missing = 0
CSV.open("data/general_election_2010_openspace.csv", "wb",
         :write_headers=>true,
         :headers=>CSV_2010_RESULT_HEADERS ) do |csv|
    CSV.foreach("data/general_election_2010_results.csv", headers:true) do |row|
        if row["Elected"] == "*"

            wmc_id = make_id_from_boundary_name(row["Seat"])
            wmc = wmc_admin_units[wmc_id]

            if !wmc
                puts "Unable to find admin unit id for #{row["Seat"]}"
                missing += 1
            else
                csv << [wmc[:admin_unit_id], wmc[:name], row["Party"], row["% Majority"], row["% Turnout"]]
                wmc_admin_units.delete(wmc_id)
            end
        end
    end
end

#The election results contain Northern Ireland constituencies. The Openspace
#boundary web service includes them separately from the rest of the UK. We can safely skip them.
if missing > TOTAL_NORTHERN_IRELAND_CONSTITUENCIES
    puts "Failed to find openspace data for #{missing - TOTAL_NORTHERN_IRELAND_CONSTITUENCIES} constituencies."
end

if wmc_admin_units.length > 0
    puts "Failed to find election data for the following constituencies: #{wmc_admin_units.values.map{|w| w[:name]}.to_s}"
end

