/* ============================================
   BLACK ANCESTRAL ORIGINS — Data Layer
   Dawes Rolls, Freedmen Records, Historical Data
   ============================================ */

const BAO_DATA = {

    // ============== DAWES ROLLS SAMPLE DATA ==============
    dawesRolls: [
        { id: 'DR001', rollNumber: 1523, name: 'Washington, George', tribe: 'Cherokee', bloodQuantum: 'Freedman', age: 45, sex: 'M', postOffice: 'Fort Gibson, I.T.', enrollDate: '1898-09-14', district: 'Tahlequah', county: 'Cherokee Nation', status: 'Approved', cardNumber: 'F-287', notes: 'Former enslaved person of Stand Watie. Listed with wife and 3 children.' },
        { id: 'DR002', rollNumber: 1524, name: 'Washington, Mary', tribe: 'Cherokee', bloodQuantum: 'Freedman', age: 40, sex: 'F', postOffice: 'Fort Gibson, I.T.', enrollDate: '1898-09-14', district: 'Tahlequah', county: 'Cherokee Nation', status: 'Approved', cardNumber: 'F-287', notes: 'Wife of George Washington (Roll #1523).' },
        { id: 'DR003', rollNumber: 2891, name: 'Brown, Samuel', tribe: 'Creek', bloodQuantum: 'Freedman', age: 52, sex: 'M', postOffice: 'Muskogee, I.T.', enrollDate: '1899-03-22', district: 'Muskogee', county: 'Creek Nation', status: 'Approved', cardNumber: 'F-412', notes: 'Creek Freedman. Allotment near Okmulgee.' },
        { id: 'DR004', rollNumber: 3210, name: 'Jackson, Sarah', tribe: 'Choctaw', bloodQuantum: 'Freedman', age: 35, sex: 'F', postOffice: 'Atoka, I.T.', enrollDate: '1899-06-10', district: 'Atoka', county: 'Choctaw Nation', status: 'Approved', cardNumber: 'F-518', notes: 'Choctaw Freedwoman. Mother of 5 children enrolled on same card.' },
        { id: 'DR005', rollNumber: 4102, name: 'Davis, James', tribe: 'Chickasaw', bloodQuantum: 'Freedman', age: 60, sex: 'M', postOffice: 'Tishomingo, I.T.', enrollDate: '1900-01-08', district: 'Tishomingo', county: 'Chickasaw Nation', status: 'Approved', cardNumber: 'F-633', notes: 'Elder Freedman. Born enslaved circa 1840.' },
        { id: 'DR006', rollNumber: 4501, name: 'Williams, Henry', tribe: 'Cherokee', bloodQuantum: 'Freedman', age: 28, sex: 'M', postOffice: 'Vinita, I.T.', enrollDate: '1900-04-15', district: 'Cooweescoowee', county: 'Cherokee Nation', status: 'Approved', cardNumber: 'F-701', notes: 'Son of Cherokee Freedman. Father listed on 1880 Cherokee Census.' },
        { id: 'DR007', rollNumber: 5023, name: 'Thompson, Eliza', tribe: 'Creek', bloodQuantum: 'Freedman', age: 48, sex: 'F', postOffice: 'Tulsa, I.T.', enrollDate: '1900-07-20', district: 'Tulsa', county: 'Creek Nation', status: 'Approved', cardNumber: 'F-789', notes: 'Creek Freedwoman. Previously on 1895 Creek Census Roll.' },
        { id: 'DR008', rollNumber: 5567, name: 'Robinson, Charles', tribe: 'Seminole', bloodQuantum: 'Freedman', age: 55, sex: 'M', postOffice: 'Wewoka, I.T.', enrollDate: '1900-11-03', district: 'Wewoka', county: 'Seminole Nation', status: 'Approved', cardNumber: 'F-845', notes: 'Seminole Freedman. Descendant of Black Seminoles who fought in Seminole Wars.' },
        { id: 'DR009', rollNumber: 6120, name: 'Harris, Martha', tribe: 'Choctaw', bloodQuantum: 'Freedman', age: 42, sex: 'F', postOffice: 'Durant, I.T.', enrollDate: '1901-02-18', district: 'Durant', county: 'Choctaw Nation', status: 'Approved', cardNumber: 'F-912', notes: 'Choctaw Freedwoman. Allotment in Bryan County area.' },
        { id: 'DR010', rollNumber: 6890, name: 'Johnson, Robert', tribe: 'Cherokee', bloodQuantum: 'Freedman', age: 38, sex: 'M', postOffice: 'Claremore, I.T.', enrollDate: '1901-05-22', district: 'Cooweescoowee', county: 'Cherokee Nation', status: 'Approved', cardNumber: 'F-998', notes: 'Cherokee Freedman. Skilled blacksmith. Land allotment near present-day Rogers County.' },
        { id: 'DR011', rollNumber: 7234, name: 'Lewis, Annie', tribe: 'Creek', bloodQuantum: 'Freedman', age: 31, sex: 'F', postOffice: 'Okmulgee, I.T.', enrollDate: '1901-08-14', district: 'Okmulgee', county: 'Creek Nation', status: 'Approved', cardNumber: 'F-1045', notes: 'Creek Freedwoman. Enrolled with 2 minor children.' },
        { id: 'DR012', rollNumber: 8001, name: 'Carter, William', tribe: 'Chickasaw', bloodQuantum: 'Freedman', age: 50, sex: 'M', postOffice: 'Ardmore, I.T.', enrollDate: '1901-12-05', district: 'Ardmore', county: 'Chickasaw Nation', status: 'Denied', cardNumber: 'N/A', notes: 'Application denied. Reapplied 1902 — later approved on appeal.' },
    ],

    // ============== FREEDMEN RECORDS ==============
    freedmenRecords: [
        { id: 'FR001', name: 'Washington, George', contractDate: '1866-08-15', formerOwner: 'Stand Watie', tribe: 'Cherokee', type: 'Treaty of 1866', location: 'Fort Gibson', occupation: 'Farmer', familySize: 5, notes: 'Freed under Article 9 of Cherokee Treaty of 1866. Given 160 acres near Fort Gibson.' },
        { id: 'FR002', name: 'Brown, Samuel', contractDate: '1866-09-20', formerOwner: 'Samuel Checote', tribe: 'Creek', type: 'Treaty of 1866', location: 'Okmulgee', occupation: 'Laborer', familySize: 3, notes: 'Creek Freedman rights under Creek Treaty of 1866. Participated in Creek Council.' },
        { id: 'FR003', name: 'Jackson, Sarah', contractDate: '1866-10-05', formerOwner: 'Peter Pitchlynn', tribe: 'Choctaw', type: 'Treaty of 1866', location: 'Atoka', occupation: 'Domestic worker', familySize: 6, notes: 'Choctaw Freedwoman. Family maintained ties to Choctaw community through 20th century.' },
        { id: 'FR004', name: 'Davis, James', contractDate: '1866-07-10', formerOwner: 'Winchester Colbert', tribe: 'Chickasaw', type: 'Treaty of 1866', location: 'Tishomingo', occupation: 'Farmer', familySize: 4, notes: 'Chickasaw Freedman. Despite treaty, Chickasaw Nation delayed citizenship rights.' },
        { id: 'FR005', name: 'Robinson, Charles', contractDate: '1866-06-22', formerOwner: 'John Jumper', tribe: 'Seminole', type: 'Treaty of 1866', location: 'Wewoka', occupation: 'Rancher', familySize: 7, notes: 'Seminole Freedman. Part of Seminole Freedmen Bands. Family history traced to Maroon communities in Florida.' },
        { id: 'FR006', name: 'Thompson, Eliza', contractDate: '1867-01-12', formerOwner: 'Opothleyahola heirs', tribe: 'Creek', type: 'Treaty of 1866', location: 'Tulsa', occupation: 'Midwife', familySize: 4, notes: 'Served as community midwife. Oral histories passed down through 4 generations.' },
        { id: 'FR007', name: 'Mitchell, Abraham', contractDate: '1866-12-01', formerOwner: 'Lewis Downing', tribe: 'Cherokee', type: 'Treaty of 1866', location: 'Tahlequah', occupation: 'Minister', familySize: 8, notes: 'Founded one of first Black churches in Indian Territory. Community leader.' },
        { id: 'FR008', name: 'Green, Patience', contractDate: '1867-03-15', formerOwner: 'Allen Wright', tribe: 'Choctaw', type: 'Treaty of 1866', location: 'Boggy Depot', occupation: 'Seamstress', familySize: 3, notes: 'Skilled seamstress. Traveled Trail of Tears with Choctaw enslaver family.' },
    ],

    // ============== SLAVE SCHEDULES ==============
    slaveSchedules: [
        { id: 'SS001', year: 1860, state: 'Indian Territory', county: 'Cherokee Nation', owner: 'Stand Watie', slaveNumber: 12, age: 35, sex: 'M', color: 'Black', possibleName: 'George (Washington)', notes: 'Prominent Cherokee tribal member and Confederate general. One of largest enslavers in Cherokee Nation.' },
        { id: 'SS002', year: 1860, state: 'Indian Territory', county: 'Cherokee Nation', owner: 'Stand Watie', slaveNumber: 13, age: 30, sex: 'F', color: 'Black', possibleName: 'Mary (Washington)', notes: 'Listed alongside male person #12. Likely married couple.' },
        { id: 'SS003', year: 1860, state: 'Indian Territory', county: 'Creek Nation', owner: 'Samuel Checote', slaveNumber: 5, age: 42, sex: 'M', color: 'Black', possibleName: 'Samuel (Brown)', notes: 'Creek Chief held enslaved people. Later supported Freedmen rights.' },
        { id: 'SS004', year: 1860, state: 'Indian Territory', county: 'Choctaw Nation', owner: 'Peter Pitchlynn', slaveNumber: 8, age: 25, sex: 'F', color: 'Mulatto', possibleName: 'Sarah (Jackson)', notes: 'Choctaw Principal Chief. One of largest tribal enslavers in Choctaw Nation.' },
        { id: 'SS005', year: 1860, state: 'Indian Territory', county: 'Chickasaw Nation', owner: 'Winchester Colbert', slaveNumber: 3, age: 50, sex: 'M', color: 'Black', possibleName: 'James (Davis)', notes: 'Prominent Chickasaw family. Enslaved people worked cotton plantation.' },
        { id: 'SS006', year: 1850, state: 'Indian Territory', county: 'Cherokee Nation', owner: 'John Ross', slaveNumber: 22, age: 18, sex: 'M', color: 'Black', possibleName: 'Unknown', notes: 'Cherokee Principal Chief. Held over 100 enslaved persons.' },
        { id: 'SS007', year: 1850, state: 'Indian Territory', county: 'Seminole Nation', owner: 'John Jumper', slaveNumber: 7, age: 45, sex: 'M', color: 'Black', possibleName: 'Charles (Robinson)', notes: 'Freedmen within the Seminole Nation had more autonomy than in other tribal nations.' },
        { id: 'SS008', year: 1860, state: 'Mississippi', county: 'Noxubee', owner: 'Thomas Pitchlynn', slaveNumber: 15, age: 20, sex: 'F', color: 'Black', possibleName: 'Unknown', notes: 'Choctaw family with Mississippi roots before Removal.' },
    ],

    // ============== LAND ALLOTMENTS ==============
    landAllotments: [
        { id: 'LA001', allottee: 'Washington, George', rollNumber: 1523, tribe: 'Cherokee', acreage: 110, location: 'Fort Gibson, Cherokee Nation', section: 'Section 14, Township 15N, Range 19E', datePatented: '1903-04-12', landType: 'Surplus', status: 'Patented', notes: 'Bottomland near Illinois River. Good farming soil.' },
        { id: 'LA002', allottee: 'Brown, Samuel', rollNumber: 2891, tribe: 'Creek', acreage: 160, location: 'Near Okmulgee, Creek Nation', section: 'Section 22, Township 13N, Range 12E', datePatented: '1903-07-28', landType: 'Homestead', status: 'Patented', notes: 'Full 160-acre allotment. Remained in family until 1930s.' },
        { id: 'LA003', allottee: 'Jackson, Sarah', rollNumber: 3210, tribe: 'Choctaw', acreage: 160, location: 'Near Atoka, Choctaw Nation', section: 'Section 8, Township 2S, Range 11E', datePatented: '1904-01-15', landType: 'Homestead', status: 'Patented', notes: 'Family homestead. Lost through grafting schemes in 1910s.' },
        { id: 'LA004', allottee: 'Davis, James', rollNumber: 4102, tribe: 'Chickasaw', acreage: 80, location: 'Near Tishomingo, Chickasaw Nation', section: 'Section 30, Township 3S, Range 6E', datePatented: '1904-06-20', landType: 'Surplus', status: 'Restricted', notes: 'Restricted allotment. Chickasaw Freedmen received smaller allotments.' },
        { id: 'LA005', allottee: 'Robinson, Charles', rollNumber: 5567, tribe: 'Seminole', acreage: 120, location: 'Near Wewoka, Seminole Nation', section: 'Section 5, Township 7N, Range 7E', datePatented: '1903-11-08', landType: 'Homestead', status: 'Patented', notes: 'Seminole Freedman allotment. Family ranch operation.' },
        { id: 'LA006', allottee: 'Johnson, Robert', rollNumber: 6890, tribe: 'Cherokee', acreage: 110, location: 'Near Claremore, Cherokee Nation', section: 'Section 18, Township 22N, Range 16E', datePatented: '1904-03-22', landType: 'Surplus', status: 'Fee Simple', notes: 'Located near present-day Rogers County. Oil discovered on adjacent land 1905.' },
    ],

    // ============== HISTORICAL TIMELINE ==============
    timeline: [
        { year: '1492', title: 'Indigenous Peoples Before Contact', description: 'Five Civilized Tribes — Cherokee, Choctaw, Chickasaw, Creek, and Seminole — established complex societies across southeastern North America. Some nations practiced forms of servitude distinct from the later institution of enslavement.', category: 'origins' },
        { year: '1500s', title: 'Early Black Indigenous Presence', description: 'Black Indigenous people lived among and intermarried with members of the Five Civilized Tribes. Relationships between Black and Indigenous peoples predate the formal institution of enslavement within the tribal nations.', category: 'origins' },
        { year: '1600s-1700s', title: 'Enslavement Within Tribal Nations', description: 'Some Native nations, influenced by European colonizers, adopted the practice of holding Black people in bondage. The institution grew among the Five Civilized Tribes, particularly among mixed-heritage tribal elites.', category: 'enslavement' },
        { year: '1812-1815', title: 'Black Participation in Creek Wars', description: 'Black men, both free and enslaved, fought alongside Creek Red Stick warriors and Andrew Jackson\'s forces. Black Seminoles played crucial military roles in Florida.', category: 'military' },
        { year: '1830', title: 'Indian Removal Act', description: 'President Andrew Jackson signs the Indian Removal Act. Enslaved Black people were forced to march alongside their Native enslavers on the Trail of Tears. Many died during the journey.', category: 'removal' },
        { year: '1831-1850', title: 'Trail of Tears', description: 'Forced removal of Five Civilized Tribes to Indian Territory (present-day Oklahoma). Enslaved Black Indigenous people walked the same routes, carrying goods and caring for children. Thousands perished.', category: 'removal' },
        { year: '1835-1842', title: 'Second Seminole War', description: 'Black Seminoles played decisive roles as warriors, interpreters, and scouts. Many were fighting to prevent re-enslavement. This was the most expensive Indian War the U.S. fought.', category: 'military' },
        { year: '1838', title: 'Cherokee Trail of Tears', description: 'Over 16,000 Cherokee and their enslaved persons forced west. Approximately 4,000 Cherokee and unknown numbers of enslaved Blacks died. Chief John Ross held over 100 enslaved people.', category: 'removal' },
        { year: '1850-1860', title: 'Enslavement in Indian Territory', description: 'By 1860, the Five Civilized Tribes held approximately 8,000 Freedmen ancestors in bondage. The Cherokee, Choctaw, and Chickasaw Nations held the most. Tribal codes governing the enslaved mirrored those of Southern states.', category: 'enslavement' },
        { year: '1861', title: 'Civil War Divides Indian Territory', description: 'Indian Territory splits between Union and Confederacy. Stand Watie becomes only Native American Confederate general. Many enslaved people escaped to Union lines in Kansas.', category: 'civil-war' },
        { year: '1863', title: 'Emancipation in Indian Territory', description: 'The Emancipation Proclamation does not directly apply to Indian Territory. However, many enslaved persons self-emancipate by fleeing to Union-controlled areas.', category: 'civil-war' },
        { year: '1865', title: 'End of Civil War & Enslavement in Indian Territory', description: 'Confederate forces surrender. Enslavement formally ends in Indian Territory. Freedmen face uncertain futures — free but without land, citizenship, or legal protections within the tribal nations.', category: 'civil-war' },
        { year: '1866', title: 'Reconstruction Treaties', description: 'The Five Civilized Tribes sign new treaties with the U.S. government. Treaties require adoption of Freedmen as citizens with rights equal to native-born members, including land rights.', category: 'treaty' },
        { year: '1887', title: 'Dawes Act', description: 'General Allotment Act passed. Tribal lands to be divided into individual allotments. This would profoundly affect both Native peoples and Freedmen.', category: 'treaty' },
        { year: '1893', title: 'Dawes Commission Established', description: 'Congress creates the Commission to the Five Civilized Tribes (Dawes Commission) to negotiate allotment agreements and create citizenship rolls.', category: 'treaty' },
        { year: '1896', title: 'Enrollment Begins', description: 'The Dawes Commission begins enrolling members of the Five Civilized Tribes. Freedmen are enrolled on separate rolls from "by blood" citizens, creating a lasting distinction.', category: 'dawes' },
        { year: '1898', title: 'Curtis Act', description: 'Curtis Act dissolves tribal courts and governments, mandates allotment of tribal lands. Freedmen eligible for allotments but face discrimination in land quality and quantity.', category: 'dawes' },
        { year: '1898-1914', title: 'Dawes Rolls Enrollment Period', description: 'Over 100,000 individuals enrolled. Freedmen placed on separate rolls. Cherokee Freedmen: ~4,900. Creek Freedmen: ~6,800. Choctaw Freedmen: ~5,000. Chickasaw Freedmen: ~4,600. Seminole Freedmen: ~900.', category: 'dawes' },
        { year: '1901-1910', title: 'Land Allotment & Grafting', description: 'Freedmen receive land allotments but face widespread fraud ("grafting"). Unscrupulous speculators, appointed guardians, and corrupt officials swindle Freedmen and full-blood Natives out of valuable land.', category: 'dawes' },
        { year: '1906', title: 'Oklahoma Enabling Act', description: 'Act provides for Oklahoma statehood. Indian and Oklahoma Territories to be combined. Tribal governments effectively dissolved.', category: 'statehood' },
        { year: '1907', title: 'Oklahoma Statehood & Jim Crow', description: 'Oklahoma becomes the 46th state. First act of new legislature: Senate Bill 1 establishing Jim Crow segregation. Freedmen lose political voice and face same racism as all Black Oklahomans.', category: 'statehood' },
        { year: '1921', title: 'Tulsa Race Massacre', description: 'White mobs destroy the Greenwood District ("Black Wall Street") in Tulsa. Many victims were descendants of Freedmen who had built wealth from Indian Territory allotments.', category: 'modern' },
        { year: '1970s-1980s', title: 'Freedmen Citizenship Challenges', description: 'Tribes begin excluding Freedmen descendants from citizenship, requiring proof of blood quantum rather than honoring treaty-based citizenship. Legal battles begin.', category: 'modern' },
        { year: '1983', title: 'Cherokee Constitution', description: 'New Cherokee Constitution limits citizenship to those who can prove Cherokee blood ancestry, effectively excluding many Freedmen descendants who had been citizens since 1866.', category: 'modern' },
        { year: '2006', title: 'Cherokee Freedmen Lawsuit', description: 'Cherokee Nation votes to amend constitution to exclude Freedmen. Major legal battle ensues over treaty rights and citizenship.', category: 'modern' },
        { year: '2017', title: 'Cherokee Nation v. Nash Decision', description: 'Federal court rules Cherokee Freedmen have right to citizenship under the 1866 treaty. Landmark victory for Freedmen descendants.', category: 'modern' },
        { year: '2021', title: 'Freedmen Rights Continue', description: 'Ongoing efforts to secure rights for Freedmen descendants across all Five Civilized Tribes. Chickasaw and Choctaw Freedmen still fighting for recognition.', category: 'modern' },
        { year: '2023-Present', title: 'Heritage Preservation Movement', description: 'Growing movement to preserve Black Indigenous heritage, digitize records, and connect descendants with their ancestral roots through genealogy and DNA research.', category: 'modern' },
    ],

    // ============== DNA HERITAGE REGIONS ==============
    heritageRegions: [
        { name: 'Indigenous Americas', percentage: 35, color: '#FFB830', description: 'Native American ancestry from the Five Civilized Tribes — Cherokee, Choctaw, Creek, Chickasaw, and Seminole Nations' },
        { name: 'West & Central Heritage', percentage: 25, color: '#9B4DCA', description: 'Ancestral connections through the historical Freedmen experience within the tribal nations' },
        { name: 'European Admixture', percentage: 15, color: '#4ECDC4', description: 'European ancestry common among Freedmen descendants due to historical intermixing in Indian Territory' },
        { name: 'Southeastern Woodlands', percentage: 20, color: '#E65100', description: 'Deep ancestral roots in the Southeastern United States homeland of the Five Civilized Tribes' },
        { name: 'Other Indigenous', percentage: 5, color: '#C62828', description: 'Connections to other Native nations through intermarriage and migration' },
    ],

    // ============== MIGRATION ROUTES ==============
    migrationRoutes: [
        { id: 'MR001', name: 'Trail of Tears (Cherokee)', from: 'Southeast U.S. (Georgia, Tennessee, North Carolina)', to: 'Indian Territory (Oklahoma)', period: '1836-1839', description: 'Forced removal of Cherokee Nation and their Freedmen ancestors. Multiple routes through Tennessee, Kentucky, Illinois, Missouri, and Arkansas.' },
        { id: 'MR002', name: 'Choctaw Removal', from: 'Mississippi', to: 'Indian Territory (Oklahoma)', period: '1831-1833', description: 'First of the Five Civilized Tribes to be removed. Freedmen ancestors accompanied Choctaw families during forced removal.' },
        { id: 'MR003', name: 'Creek Removal', from: 'Alabama', to: 'Indian Territory (Oklahoma)', period: '1836-1837', description: 'Muscogee (Creek) people and their Freedmen ancestors forcibly relocated.' },
        { id: 'MR004', name: 'Seminole Removal', from: 'Florida', to: 'Indian Territory (Oklahoma)', period: '1836-1842', description: 'Black Seminoles fought alongside Seminoles against removal. Many were captured and forced back into bondage.' },
        { id: 'MR005', name: 'Great Migration North', from: 'Oklahoma & Southern States', to: 'Northern & Western Cities', period: '1910-1970', description: 'Freedmen descendants joined the Great Migration, moving to cities like Chicago, Detroit, Los Angeles, and Oakland.' },
        { id: 'MR006', name: 'Exoduster Movement', from: 'Indian Territory & Southern States', to: 'Kansas', period: '1879-1880', description: 'Black families, including some Freedmen, migrated to Kansas seeking freedom from racial violence and oppression.' },
    ],

    // ============== NAME ORIGINS ==============
    nameOrigins: [
        { name: 'Washington', origin: 'English (Tribal enslaver surname)', meaning: 'From the town associated with Wassa\'s people', context: 'Most common surname among Black Indigenous Freedmen descendants. Many Freedmen took names of former enslavers or prominent figures like George Washington.', frequency: 'Very Common' },
        { name: 'Freedman', origin: 'Legal status designation', meaning: 'A person freed from enslavement within a tribal nation', context: 'Some Freedmen adopted this as a surname to mark their new status after emancipation.', frequency: 'Uncommon' },
        { name: 'Vann', origin: 'Cherokee tribal enslaver family', meaning: 'From the prominent Cherokee Vann family', context: 'James Vann was one of the wealthiest Cherokee tribal enslavers. Many Freedmen carried this surname.', frequency: 'Common in Cherokee Freedmen' },
        { name: 'Colbert', origin: 'Chickasaw elite family', meaning: 'From the Chickasaw Colbert dynasty', context: 'The Colbert family dominated Chickasaw politics and were among the largest tribal enslavers.', frequency: 'Common in Chickasaw Freedmen' },
        { name: 'Love', origin: 'Chickasaw tribal enslaver family', meaning: 'English surname', context: 'Benjamin Love and Robert Love were prominent Chickasaw tribal enslavers. Many Freedmen inherited this name.', frequency: 'Common in Chickasaw Freedmen' },
        { name: 'Ross', origin: 'Cherokee Chief family', meaning: 'Scottish origin', context: 'Principal Chief John Ross held over 100 enslaved persons. Freedmen often took this name.', frequency: 'Common in Cherokee Freedmen' },
        { name: 'Rentie/Renty', origin: 'Indigenous/Historical', meaning: 'Possibly from Yoruba or Akan naming traditions', context: 'Name found in both tribal records and Freedmen rolls. Reflects naming traditions that predate formal record-keeping within the Five Civilized Tribes.', frequency: 'Rare' },
        { name: 'Bruner', origin: 'Creek Nation family', meaning: 'German/Creek origin', context: 'The Bruner family were prominent Creek citizens. Some Freedmen carried this surname through generations.', frequency: 'Common in Creek Freedmen' },
        { name: 'Factor', origin: 'Seminole/Creek term', meaning: 'Trading post operator or interpreter', context: 'Title given to Black Seminoles who served as interpreters and negotiators between tribes and the U.S. government.', frequency: 'Uncommon' },
        { name: 'Bowlegs', origin: 'Seminole leadership name', meaning: 'From Seminole Chief Billy Bowlegs', context: 'Some Black Seminoles carried this name through their close alliance with Seminole leadership.', frequency: 'Rare - Seminole Freedmen' },
    ],

    // ============== COMMUNITY POSTS ==============
    communityPosts: [
        { id: 'CP001', author: 'Heritage_Seeker_405', avatar: 'HS', content: 'Just found my great-great-grandmother on the Dawes Rolls! She was a Creek Freedwoman enrolled in 1899. Card number F-412. If anyone has connections to the Brown family in Okmulgee area, please reach out!', likes: 24, time: '2 hours ago', topic: 'Discovery', tribe: 'Creek', pinned: false, replies: [{ id: 'R001', author: 'OklahomaRoots', avatar: 'OR', content: 'Congratulations! The Brown family appears in the Creek Freedmen census of 1895 as well. Check the Muskogee County courthouse records for allotment details.', time: '1 hour ago', likes: 8 }, { id: 'R002', author: 'DigitalGriot', avatar: 'DG', content: 'Amazing find! F-412 should have an allotment record in the Creek Nation. Check Fold3 for the full enrollment packet.', time: '45 min ago', likes: 5 }] },
        { id: 'CP002', author: 'FreedmenResearcher', avatar: 'FR', content: 'Important tip for those searching: Don\'t just check the Freedmen rolls. Cross-reference with the 1880 Cherokee Census, Kern-Clifton Roll (1896), and Wallace Roll (1890). These earlier records can fill gaps the Dawes Rolls miss.', likes: 67, time: '5 hours ago', topic: 'Research Tips', tribe: 'Cherokee', pinned: true, replies: [{ id: 'R003', author: 'Heritage_Seeker_405', avatar: 'HS', content: 'This is gold! I found my ancestor on the Kern-Clifton Roll after missing them on the Dawes. Thank you!', time: '3 hours ago', likes: 12 }] },
        { id: 'CP003', author: 'OklahomaRoots', avatar: 'OR', content: 'My family\'s allotment land near Muskogee was taken through a "guardian" scheme in 1912. The guardian was appointed by the county court and systematically sold off Freedmen lands. Anyone else have similar stories?', likes: 45, time: '1 day ago', topic: 'Rights', tribe: 'Creek', pinned: false, replies: [{ id: 'R004', author: 'TreatyRights2024', avatar: 'TR', content: 'This happened to thousands of Freedmen families. The guardianship system was legalized theft. Check the Angie Debo collection at Oklahoma State University for documentation.', time: '20 hours ago', likes: 15 }, { id: 'R005', author: 'FreedmenResearcher', avatar: 'FR', content: 'Look into the "Investigation of Indian Affairs" congressional hearings from 1906-1907. They documented these exact abuses.', time: '18 hours ago', likes: 9 }] },
        { id: 'CP004', author: 'DigitalGriot', avatar: 'DG', content: 'Recorded my 92-year-old grandmother talking about her childhood in an all-Black town near Boley, Oklahoma. Her grandfather was a Cherokee Freedman. These oral histories are irreplaceable — please record your elders while you can.', likes: 112, time: '2 days ago', topic: 'Discovery', tribe: 'Cherokee', pinned: false, replies: [{ id: 'R006', author: 'Heritage_Seeker_405', avatar: 'HS', content: 'What a treasure! Have you considered uploading to the StoryCorps archive? They preserve oral histories digitally.', time: '1 day ago', likes: 7 }] },
        { id: 'CP005', author: 'TreatyRights2024', avatar: 'TR', content: 'The 1866 treaties are clear: Freedmen were to have ALL the rights of native-born citizens. The blood quantum requirement is a 20th century invention designed to exclude us. Know your history, know your rights.', likes: 89, time: '3 days ago', topic: 'Rights', tribe: 'All', pinned: false, replies: [{ id: 'R007', author: 'OklahomaRoots', avatar: 'OR', content: 'The Cherokee Nation Supreme Court ruled in 2006 that Freedmen have citizenship rights. This was upheld again in 2017. The legal precedent is strong.', time: '2 days ago', likes: 22 }, { id: 'R008', author: 'FreedmenResearcher', avatar: 'FR', content: 'Everyone should read the full text of Article 9 of the Cherokee Treaty of 1866. It is unambiguous about Freedmen rights.', time: '2 days ago', likes: 18 }] },
    ],

    // ============== COMMUNITY DISCOVERIES ==============
    communityDiscoveries: [
        { id: 'CD001', author: 'Heritage_Seeker_405', avatar: 'HS', type: 'dawes_card', tribe: 'Creek', title: 'Creek Freedwoman — Dawes Card F-412', content: 'Found my great-great-grandmother Sarah Brown on the Creek Freedmen roll. Card F-412, enrolled 1899, Okmulgee district. She was listed with 3 children.', date: 'March 15, 2026', verified: true },
        { id: 'CD002', author: 'DNAExplorer_918', avatar: 'DE', type: 'dna_result', tribe: 'Cherokee', title: 'Haplogroup A2 — Native American Maternal Line', content: 'My mtDNA results came back as Haplogroup A2, confirming a direct Native American maternal line. Combined with my Cherokee Freedmen Dawes card documentation, this connects my family to pre-removal Cherokee Nation.', date: 'March 12, 2026', verified: true },
        { id: 'CD003', author: 'OklahomaRoots', avatar: 'OR', type: 'document', tribe: 'Choctaw', title: 'Original 1902 Allotment Deed Found', content: 'Located the original allotment deed for my great-grandfather\'s 40-acre parcel in Atoka County, Choctaw Nation. The deed was filed at the Muskogee Land Office and shows the legal description matching his Dawes enrollment.', date: 'March 8, 2026', verified: true },
        { id: 'CD004', author: 'SeminolePride', avatar: 'SP', type: 'citizenship', tribe: 'Seminole', title: 'Seminole Nation Citizenship Approved!', content: 'After 2 years of research and documentation, my Seminole Nation citizenship application was approved! I am officially enrolled as a member of the Caesar Bruner Freedmen Band. Never give up on your journey!', date: 'March 1, 2026', verified: true },
        { id: 'CD005', author: 'DigitalGriot', avatar: 'DG', type: 'document', tribe: 'Cherokee', title: '1866 Freedmen Bureau Labor Contract', content: 'Found an original Freedmen Bureau labor contract from 1866 at the National Archives showing my ancestor working in the Cherokee Nation just months after emancipation. The document lists his full name, employer, and wage terms.', date: 'February 25, 2026', verified: true },
        { id: 'CD006', author: 'ChickasawTracer', avatar: 'CT', type: 'dawes_card', tribe: 'Chickasaw', title: 'Chickasaw Freedman Card #1847', content: 'Located my great-great-grandfather on Chickasaw Freedmen Dawes Card #1847. He was enrolled in 1903 at the Tishomingo office. The card lists his wife and 5 children.', date: 'February 20, 2026', verified: true },
    ],

    // ============== RESEARCH TIPS ==============
    communityResearchTips: [
        { id: 'RT001', title: 'How to Search FamilySearch for Freedmen Records', icon: '&#128269;', steps: ['Go to familysearch.org and create a free account', 'Click "Search" then "Records" in the top menu', 'In the search box type your ancestor\'s surname and select "Oklahoma" as the location', 'Use the "Collections" filter on the left — look for "Indian Territory" and "Five Civilized Tribes"', 'Check the "Dawes Rolls" collection, "Indian Census Rolls 1885-1940," and "Oklahoma and Indian Territory Early Land Records"', 'For Freedmen specifically, search "Freedmen" in the Collections page to find Bureau records', 'Download and save any matching records to your Document Vault in this app'], tribe: 'All' },
        { id: 'RT002', title: 'Navigating OkHistory (Oklahoma Historical Society)', icon: '&#127963;', steps: ['Visit okhistory.org/research and click on "Online Resources"', 'Use the Dawes Rolls search at okhistory.org/research/dawes — enter your ancestor\'s surname', 'Browse the "Indian-Pioneer Papers" collection for personal accounts from Indian Territory', 'Check the "Encyclopedia of Oklahoma History" for tribal-specific Freedmen articles', 'Search the newspaper archive for Oklahoma Territory mentions of your family surname', 'Visit the Oklahoma History Center in OKC for original documents not available online', 'Request document copies by mail if you cannot visit in person — contact research@okhistory.org'], tribe: 'All' },
        { id: 'RT003', title: 'Mining Freedmen Bureau Records', icon: '&#128220;', steps: ['Freedmen Bureau records cover 1865-1872 — the critical period right after emancipation in Indian Territory', 'Search at familysearch.org under "United States, Freedmen\'s Bureau Records"', 'Look for four record types: labor contracts, ration lists, marriage registers, and school records', 'For Cherokee Freedmen, focus on the Fort Gibson sub-district records', 'For Choctaw Freedmen, check Fort Towson and Skullyville agency records', 'For Creek Freedmen, search the Fort Gibson and Okmulgee area records', 'Labor contracts often list full names, ages, family members, and former enslaver names — gold for genealogy'], tribe: 'All' },
        { id: 'RT004', title: 'Census Records Strategy for Five Tribes Freedmen', icon: '&#128203;', steps: ['Start with the 1900 US Federal Census — it was the first to cover Indian Territory households', 'The 1900 Census asks for "Tribe" and "Blood Status" — look for entries marked "Freedman"', 'Check the 1910 Census which covers Oklahoma after statehood (1907)', 'For earlier records, search tribal-specific censuses: Cherokee (1880, 1890, 1896), Choctaw (1885, 1893), Creek (1890, 1895)', 'The Indian Census Rolls 1885-1940 on FamilySearch contain annual tribal census data', 'Cross-reference census entries with Dawes Roll cards to confirm identity matches', 'Pay attention to neighbors listed on the same census page — they may be relatives or tribal connections'], tribe: 'All' },
        { id: 'RT005', title: 'Finding Land Allotment Records', icon: '&#127757;', steps: ['Land allotments were assigned by the Dawes Commission between 1899-1907', 'Search the BLM General Land Office records at glorecords.blm.gov for patents', 'Check the Oklahoma Historical Society for allotment plat maps showing exact locations', 'Each tribe had different allotment sizes: Creek Freedmen got 160 acres, Choctaw Freedmen got 40 acres', 'Look for "surplus" allotments — some Freedmen received additional land beyond their initial allotment', 'Allotment records show legal descriptions (Section, Township, Range) that can be mapped today', 'Check county deed records for subsequent sales or transfers of allotment land — many were lost to grafting'], tribe: 'All' },
        { id: 'RT006', title: 'National Archives Deep Dive', icon: '&#127963;', steps: ['The National Archives at Fort Worth (NARA) holds the original Dawes enrollment packets', 'Request specific packets by writing to: National Archives, 1400 John Burgess Dr, Fort Worth, TX 76140', 'Enrollment packets contain the original application, witness testimony, and supporting documents', 'Search the NARA online catalog at catalog.archives.gov using keywords "Dawes" or "Five Civilized Tribes"', 'Record Group 75 (Bureau of Indian Affairs) contains the richest Freedmen records', 'Request NAID numbers for specific record sets to speed up your archive visit', 'Budget 2-3 full days if visiting in person — the Freedmen records are extensive'], tribe: 'All' },
        { id: 'RT007', title: 'Cherokee Freedmen — Hidden Free Archives', icon: '&#128214;', steps: ['The Cherokee Heritage Center in Tahlequah has free Freedmen genealogy resources', 'Access Genealogy (accessgenealogy.com) has a free searchable Cherokee Freedmen index', 'The Cherokee Nation Cultural Resource Center offers free genealogy assistance', 'Search the "Cherokee Freedmen Enrollment Cards" on Fold3 — some are accessible with a free trial', 'The University of Oklahoma\'s Western History Collections has Cherokee Freedmen manuscripts', 'Check the Gilcrease Museum in Tulsa for Cherokee Nation court records mentioning Freedmen', 'The Cherokee Advocate newspaper (1844-1906) is digitized and searchable — mentions Freedmen by name'], tribe: 'Cherokee' },
        { id: 'RT008', title: 'Choctaw Freedmen — Best Search Strategies', icon: '&#128214;', steps: ['Start at the Choctaw Nation Archives in Durant, OK — they have dedicated Freedmen researchers on staff', 'The Choctaw Freedmen were enrolled in districts: Atoka, Jacks Fork, Eagle, Skullyville, Tobucksy, and others', 'Search by district first if you know where your ancestors lived', 'The 1885 Choctaw Census is available at FamilySearch — it lists Freedmen separately', 'Check the Choctaw Nation court records for land disputes — many mention Freedmen families', 'The Southeastern Oklahoma State University library has Choctaw Freedmen research guides', 'Contact the Choctaw Nation enrollment office at (580) 924-8280 for genealogy assistance'], tribe: 'Choctaw' },
    ],

    // ============== RIGHTS & ADVOCACY ==============
    communityRightsContent: {
        news: [
            { id: 'RN001', title: 'Cherokee Freedmen Maintain Full Citizenship Rights', date: 'March 2026', content: 'The Cherokee Nation continues to uphold the 2017 federal court ruling confirming that Cherokee Freedmen descendants have full citizenship rights under the 1866 Treaty. Over 10,000 Freedmen descendants are now enrolled as Cherokee citizens.', tribe: 'Cherokee' },
            { id: 'RN002', title: 'Choctaw Freedmen Descendants Push for Enrollment Reform', date: 'February 2026', content: 'Advocacy groups are calling on the Choctaw Nation to adopt Freedmen descendants under the provisions of the 1866 Treaty. Current Choctaw enrollment requires proof of Choctaw blood, excluding most Freedmen descendants.', tribe: 'Choctaw' },
            { id: 'RN003', title: 'Seminole Nation Freedmen Bands Update', date: 'January 2026', content: 'The Seminole Nation continues to recognize the Dosar Barkus and Caesar Bruner Freedmen bands. Enrollment applications are being processed through the Wewoka office with typical processing times of 6-12 months.', tribe: 'Seminole' },
            { id: 'RN004', title: 'Creek Nation Citizenship Board Reviews Freedmen Applications', date: 'March 2026', content: 'The Muscogee (Creek) Nation Citizenship Board is actively reviewing Freedmen descendant applications. Applicants must provide Dawes Roll lineage documentation and complete the citizenship application process in Okmulgee.', tribe: 'Creek' },
            { id: 'RN005', title: 'Federal Legislation Proposed for Five Tribes Freedmen Rights', date: 'February 2026', content: 'Congressional representatives have introduced legislation that would require all Five Civilized Tribes to honor the citizenship provisions of the 1866 Reconstruction Treaties for Freedmen descendants.', tribe: 'All' },
        ],
        tribalContacts: [
            { tribe: 'Cherokee Nation', phone: '(918) 453-5000', website: 'https://www.cherokee.org', address: 'P.O. Box 948, Tahlequah, OK 74465', enrollmentNote: 'Freedmen descendants have full citizenship rights since 2017' },
            { tribe: 'Choctaw Nation', phone: '(580) 924-8280', website: 'https://www.choctawnation.com', address: 'P.O. Box 1210, Durant, OK 74702', enrollmentNote: 'Currently requires proof of Choctaw blood for enrollment' },
            { tribe: 'Muscogee (Creek) Nation', phone: '(918) 732-7600', website: 'https://www.mcn-nsn.gov', address: 'P.O. Box 580, Okmulgee, OK 74447', enrollmentNote: 'Citizenship Board reviews Freedmen applications individually' },
            { tribe: 'Chickasaw Nation', phone: '(580) 436-2603', website: 'https://www.chickasaw.net', address: 'P.O. Box 1548, Ada, OK 74821', enrollmentNote: 'Blood quantum currently required — advocacy ongoing' },
            { tribe: 'Seminole Nation', phone: '(405) 257-7200', website: 'https://www.sno-nsn.gov', address: 'P.O. Box 1498, Wewoka, OK 74884', enrollmentNote: 'Recognizes Dosar Barkus and Caesar Bruner Freedmen bands' },
        ],
        legalResources: [
            { name: 'Native American Rights Fund (NARF)', url: 'https://www.narf.org', description: 'Provides legal assistance to Indian tribes and individuals on matters of tribal rights and Freedmen citizenship.' },
            { name: 'ACLU Oklahoma — Tribal Rights', url: 'https://www.acluok.org', description: 'Legal advocacy for civil rights including Freedmen descendant citizenship cases.' },
            { name: 'Oklahoma Indian Legal Services', url: 'https://www.oilsinc.org', description: 'Free legal services for Native Americans in Oklahoma including Freedmen enrollment disputes.' },
            { name: 'Freedmen Legal Defense Fund', url: 'https://www.facebook.com/groups/FreedmenLegalDefense', description: 'Community-organized legal fund supporting Freedmen citizenship cases across all Five Tribes.' },
        ],
        advocacyCampaigns: [
            { name: 'Honor the Treaties Campaign', description: 'National campaign demanding all Five Civilized Tribes honor the 1866 Treaty citizenship provisions for Freedmen descendants.', action: 'Sign the petition and share on social media with #HonorTheTreaties' },
            { name: 'Freedmen Enrollment Drive', description: 'Helping eligible Freedmen descendants complete tribal citizenship applications with free genealogy assistance and document preparation.', action: 'Contact your local Freedmen Heritage Association chapter for enrollment workshops' },
            { name: 'Congressional Advocacy', description: 'Lobbying Congress to enforce 1866 Treaty obligations through federal legislation requiring tribal compliance.', action: 'Write to your Congressional representatives urging support for Freedmen rights legislation' },
        ]
    },

    // ============== 50 ROTATING EDUCATIONAL TIPS ==============
    educationalTips: [
        'The Dawes Rolls (1898-1914) are the primary enrollment records for all Five Civilized Tribes Freedmen. Your ancestor\'s roll number is the key to unlocking all other records.',
        'Cherokee Freedmen have had full citizenship rights since a 2017 federal court ruling upheld Article 9 of the 1866 Treaty. Over 10,000 Freedmen descendants are now enrolled.',
        'The term "Freedmen" refers to formerly enslaved people within the Five Civilized Tribes who were emancipated after the Civil War and granted tribal citizenship by the 1866 Treaties.',
        'DNA testing can supplement but never replace paper records for tribal enrollment. The Dawes Roll is the legal document required for citizenship in most tribes.',
        'The Five Civilized Tribes are the Cherokee, Choctaw, Creek (Muscogee), Chickasaw, and Seminole Nations — all of which held enslaved Black people before the Civil War.',
        'Many Freedmen surnames come from former tribal enslavers: Vann (Cherokee), Colbert (Chickasaw), Love (Chickasaw), Ross (Cherokee), and Bruner (Creek/Seminole).',
        'The National Archives in Fort Worth, TX holds the original Dawes enrollment packets with applications, witness testimony, and supporting documents.',
        'Black Seminoles had a unique alliance with the Seminole people. The Dosar Barkus and Caesar Bruner bands are recognized Freedmen bands within the Seminole Nation.',
        'Cross-reference your Dawes Roll findings with the Freedmen Bureau records (1865-1872) for labor contracts, marriage records, and ration lists.',
        'The 1900 US Federal Census was the first to cover Indian Territory — look for the "Tribe" and "Blood Status" columns to identify Freedmen ancestors.',
        'Haplogroup A2 is one of the most common Native American maternal lineages found in Freedmen descendants, suggesting deep Indigenous maternal ancestry.',
        'Creek Freedmen received 160-acre allotments — the same as Creek citizens by blood. This was the most generous allotment among the Five Tribes.',
        'The Trail of Tears (1830s) forced removal of all Five Tribes from the Southeast to Indian Territory. Enslaved Black people were forced to march alongside their tribal enslavers.',
        'Over 50 all-Black towns were founded in Oklahoma by Freedmen descendants, including Boley, Langston, Taft, Rentiesville, and Red Bird.',
        'The Curtis Act of 1898 dissolved tribal governments and mandated individual land allotments, leading directly to the creation of the Dawes Rolls.',
        'Freedmen Bureau records at Fort Gibson cover Cherokee and Creek Freedmen. Fort Towson and Skullyville agencies cover Choctaw Freedmen.',
        'The 1880 Cherokee Census, Kern-Clifton Roll (1896), and Wallace Roll (1890) can fill gaps where the Dawes Rolls come up empty.',
        'Many Freedmen land allotments were lost through the "guardian" system — county courts appointed white guardians who sold off Freedmen lands.',
        'Bass Reeves, the first Black U.S. Deputy Marshal west of the Mississippi, was a formerly enslaved man in Indian Territory and possibly a Freedmen descendant.',
        'The Cherokee Advocate newspaper (1844-1906) is digitized and searchable — it frequently mentions Freedmen by name in legal notices and community news.',
        'Haplogroups B2, C1, and D1 are also Native American lineages found in some Freedmen descendants through paternal Y-DNA testing.',
        'The Choctaw Freedmen were organized by districts: Atoka, Jacks Fork, Eagle, Skullyville, and Tobucksy. Knowing your ancestor\'s district narrows your search.',
        'FamilySearch.org offers free access to millions of Freedmen-related records including Indian Territory census rolls and Freedmen Bureau documents.',
        'The 1866 Treaty with the Cherokee Nation (Article 9) states Freedmen shall have "all the rights of native Cherokees" — the legal foundation for Freedmen citizenship.',
        'Chickasaw Freedmen faced unique challenges — the Chickasaw Nation never formally adopted their Freedmen, despite the 1866 Treaty requiring it.',
        'The Oklahoma Historical Society at okhistory.org/research/dawes has a searchable Dawes Roll index with original enrollment card images.',
        'Recording oral histories from living elders is one of the most valuable genealogy activities. Stories, names, and places can lead to breakthrough discoveries.',
        'The BLM General Land Office at glorecords.blm.gov has free searchable land patent records for Freedmen allotments in Indian Territory.',
        'Seminole Freedmen were organized into two bands: Dosar Barkus and Caesar Bruner. Your band affiliation is recorded on your Dawes enrollment card.',
        'The "Indian Pioneer Papers" at the Oklahoma Historical Society contain first-person accounts from Indian Territory residents — some are Freedmen.',
        'Access Genealogy (accessgenealogy.com) provides free searchable indexes of all Five Civilized Tribes Dawes Rolls including Freedmen rolls.',
        'Many Freedmen kept detailed family Bibles recording births, deaths, and marriages — ask older family members if any survive.',
        'The Gilcrease Museum in Tulsa houses Cherokee Nation court records that frequently mention Freedmen in land and citizenship disputes.',
        'Creek Freedmen were organized by tribal towns. The Creek 1895 Census lists Freedmen within their town affiliations — a unique identifier.',
        'The University of Oklahoma\'s Western History Collections contain manuscripts and letters related to Five Tribes Freedmen experiences.',
        'Choctaw Freedmen received 40-acre allotments compared to 160 acres for Choctaw citizens by blood — a disparity documented in congressional records.',
        'The Freedmen Bureau operated in Indian Territory from 1865 to 1872. Labor contracts from this period often list full family groups with ages.',
        'Fold3.com has digitized Dawes enrollment packets with original applications and witness testimony. A free trial gives access to Freedmen packets.',
        'Oklahoma became a state in 1907, merging Indian Territory and Oklahoma Territory. Records shift from tribal to county systems after this date.',
        'The Angie Debo collection at Oklahoma State University documents land fraud and guardianship abuses targeting Freedmen allotment holders.',
        'Y-DNA haplogroup Q is the primary Native American paternal lineage. Some Freedmen descendants carry this haplogroup through direct paternal lines.',
        'The Cherokee Heritage Center in Tahlequah offers free genealogy assistance specifically for Freedmen descendants researching Cherokee connections.',
        'Indian Territory court records (pre-1907) are held at the National Archives Fort Worth branch and contain Freedmen legal proceedings.',
        'The 1893 Choctaw Census and the 1885 Choctaw Census both list Freedmen — search these at FamilySearch for pre-Dawes records.',
        'Many Freedmen served in the Union Army during the Civil War as part of the United States Colored Troops (USCT). Check USCT records at fold3.com.',
        'The Southeastern Oklahoma State University library has Choctaw Nation research guides specifically addressing Freedmen genealogy methods.',
        'When searching census records, check the neighbors listed on the same page as your ancestor — they are often relatives or tribal community members.',
        'The Treaty of 1866 with the Creek Nation granted Freedmen "all the rights and privileges of native citizens" including land, voting, and education.',
        'The Cherokee Nation Cultural Resource Center and the Choctaw Nation Archives both offer free genealogy research assistance by phone and email.',
        'Never give up on your research journey. Many Freedmen descendants have found their ancestors after years of patient searching across multiple record types.',
    ],

    // ============== RESOURCES ==============
    resources: [
        // === DAWES ROLLS RESEARCH ===
        { id: 'RS001', title: 'National Archives — Dawes Rolls Records', type: 'Archive', icon: '🏛️', description: 'Official Dawes Commission enrollment cards (1898-1914) at the National Archives in Fort Worth, TX. Search Freedmen rolls for Cherokee, Choctaw, Creek, Chickasaw, and Seminole Nations.', url: 'https://www.archives.gov/research/native-americans/dawes', category: 'Government' },
        { id: 'RS002', title: 'Oklahoma Historical Society — Indian Territory Records', type: 'Archive', icon: '📚', description: 'Searchable Dawes Roll index with original enrollment card images. Also contains Indian Territory census records, Freedmen land allotment documents, and territorial court records.', url: 'https://www.okhistory.org/research/dawes', category: 'Government' },
        { id: 'RS003', title: 'Access Genealogy — Five Tribes Dawes Rolls', type: 'Website', icon: '🌐', description: 'Free searchable index of all Five Civilized Tribes Dawes Rolls including Freedmen rolls. Cross-reference names, roll numbers, and tribal districts.', url: 'https://www.accessgenealogy.com/native/dawes-rolls.htm', category: 'Website' },
        { id: 'RS004', title: 'Fold3 — Dawes Enrollment Packets', type: 'Website', icon: '🌐', description: 'Digitized Dawes enrollment packets with original applications, witness testimony, and supporting documents for Freedmen applicants. Subscription required.', url: 'https://www.fold3.com/title/611/dawes-packets', category: 'Website' },

        // === FIVE CIVILIZED TRIBES OFFICIAL WEBSITES ===
        { id: 'RS005', title: 'Cherokee Nation Official Website', type: 'Government', icon: '🏛️', description: 'cherokee.org — Cherokee Nation tribal registration, Freedmen citizenship applications, services, and cultural resources. Freedmen descendants have full citizenship rights since 2017.', url: 'https://www.cherokee.org', category: 'Government' },
        { id: 'RS006', title: 'Choctaw Nation of Oklahoma', type: 'Government', icon: '🏛️', description: 'choctawnation.com — Choctaw Nation tribal membership, enrollment office, genealogy assistance, and Freedmen descendant resources. Main office in Durant, OK.', url: 'https://www.choctawnation.com', category: 'Government' },
        { id: 'RS007', title: 'Muscogee (Creek) Nation', type: 'Government', icon: '🏛️', description: 'mcn-nsn.gov — Muscogee Creek Nation citizenship office, enrollment applications, and cultural preservation programs. Capital in Okmulgee, OK.', url: 'https://www.mcn-nsn.gov', category: 'Government' },
        { id: 'RS008', title: 'Chickasaw Nation', type: 'Government', icon: '🏛️', description: 'chickasaw.net — Chickasaw Nation enrollment information, cultural centers, and genealogy resources. Tribal headquarters in Ada, OK.', url: 'https://www.chickasaw.net', category: 'Government' },
        { id: 'RS009', title: 'Seminole Nation of Oklahoma', type: 'Government', icon: '🏛️', description: 'sno-nsn.gov — Seminole Nation enrollment, Freedmen band information (Dosar Barkus and Caesar Bruner bands), and tribal services. Headquarters in Wewoka, OK.', url: 'https://www.sno-nsn.gov', category: 'Government' },

        // === BOOKS ON BLACK INDIGENOUS FREEDMEN ===
        { id: 'RS010', title: '"Black Indians" by William Loren Katz', type: 'Book', icon: '📖', description: 'Foundational work documenting the hidden history of Black Indigenous peoples within Native nations, including extensive coverage of Five Tribes Freedmen.', url: 'https://www.amazon.com/Black-Indians-Hidden-Heritage-William/dp/1442446366', category: 'Book' },
        { id: 'RS011', title: '"On the Trail of the Five Civilized Tribes Freedmen"', type: 'Book', icon: '📖', description: 'Step-by-step genealogy research guide specifically written for descendants tracing Freedmen ancestors through the Dawes Rolls and Indian Territory records.', url: 'https://www.amazon.com/Angela-Y-Walton-Raji/e/B001JP7TJG', category: 'Book' },
        { id: 'RS012', title: '"Black, Red and Deadly" by Art T. Burton', type: 'Book', icon: '📖', description: 'Chronicles Black Indigenous lawmen and outlaws in Indian Territory. Documents Freedmen who served as U.S. Deputy Marshals, including Bass Reeves.', url: 'https://www.amazon.com/Black-Red-Deadly-Indigenous-Gunfighters/dp/0890159947', category: 'Book' },
        { id: 'RS013', title: '"Ties That Bind" by Tiya Miles', type: 'Book', icon: '📖', description: 'Explores the complex relationships between Cherokee tribal enslavers and their enslaved people, tracing families from the Southeast through removal to Indian Territory.', url: 'https://www.amazon.com/Ties-That-Bind-Story-Afro-Cherokee/dp/0520250028', category: 'Book' },
        { id: 'RS014', title: '"The House on Diamond Hill" by Tiya Miles', type: 'Book', icon: '📖', description: 'Story of the Chief Vann House in Georgia — a Cherokee plantation that held enslaved Black people, revealing the intertwined history of Cherokee and Freedmen families.', url: 'https://www.amazon.com/House-Diamond-Hill-Cherokee-Plantation/dp/0807872679', category: 'Book' },
        { id: 'RS015', title: '"Freedom After Slavery" by Daniel Littlefield', type: 'Book', icon: '📖', description: 'Detailed account of Freedmen in the Chickasaw and Choctaw Nations after emancipation, covering the struggle for citizenship and land allotment rights.', url: 'https://www.amazon.com/Chickasaw-Freedmen-History-People-Protest/dp/0313234981', category: 'Book' },
        { id: 'RS016', title: '"Black Slaves, Indian Masters" by Barbara Krauthamer', type: 'Book', icon: '📖', description: 'Examines enslavement within the Choctaw and Chickasaw Nations, the Civil War in Indian Territory, and the creation of Freedmen communities.', url: 'https://www.amazon.com/Black-Slaves-Indian-Masters-Emancipation/dp/1469621878', category: 'Book' },
        { id: 'RS017', title: '"Black Seminoles and the Five Tribes" by Daniel Littlefield', type: 'Book', icon: '📖', description: 'History of Black Seminoles from Florida through removal, covering the unique alliance between Black Indigenous people and Seminole people within the Seminole Nation.', url: 'https://www.amazon.com/Africans-Seminoles-Removal-Emancipation-Littlefield/dp/1578068010', category: 'Book' },

        // === ORGANIZATIONS ===
        { id: 'RS018', title: 'Freedmen Heritage Association', type: 'Organization', icon: '🤝', description: 'Dedicated to preserving Freedmen heritage across all Five Civilized Tribes. Provides genealogy workshops, citizenship application assistance, and community networking.', url: 'https://www.facebook.com/groups/FreedmenHeritage', category: 'Organization' },
        { id: 'RS019', title: 'Cherokee Freedmen Association', type: 'Organization', icon: '🤝', description: 'Advocates for Cherokee Freedmen descendants rights. Provides assistance with tribal citizenship applications and connects descendants with legal resources.', url: 'https://www.facebook.com/CherokeeFreedmen', category: 'Organization' },
        { id: 'RS020', title: 'Descendants of Freedmen of the Five Civilized Tribes', type: 'Organization', icon: '🤝', description: 'National organization connecting Freedmen descendants across all Five Tribes. Hosts annual conferences, genealogy workshops, and advocacy campaigns.', url: 'https://www.facebook.com/groups/descendantsoffreedmen', category: 'Organization' },
        { id: 'RS021', title: 'Five Civilized Tribes Museum — Muskogee, OK', type: 'Museum', icon: '🏛️', description: 'Museum dedicated to Cherokee, Choctaw, Creek, Chickasaw, and Seminole history including Freedmen contributions. Houses artifacts, documents, and educational exhibits. Located at 1101 Honor Heights Dr, Muskogee, OK 74401.', url: 'https://www.facebook.com/FiveCivilizedTribesMuseum', category: 'Museum' },
        { id: 'RS022', title: 'Oklahoma Black Indigenous Genealogy Society', type: 'Organization', icon: '🤝', description: 'Helps Black Indigenous descendants research their tribal heritage through Dawes Rolls, land records, and Indian Territory archives. Offers mentorship for new researchers.', url: 'https://www.facebook.com/groups/OKBlackIndigenousGenealogy', category: 'Organization' },

        // === DNA RESOURCES FOR INDIGENOUS ANCESTRY ===
        { id: 'RS023', title: 'CRI Genetics — Native American Ancestry Test', type: 'Service', icon: '🧬', description: 'DNA testing that identifies Native American ancestry markers. Helps Freedmen descendants confirm Indigenous genetic heritage alongside tribal documentation.', url: 'https://www.crigenetics.com', category: 'DNA', sourceType: 'dna_company', priority: 2, verified: true },
        { id: 'RS024', title: 'AncestryDNA — Indigenous Americas Results', type: 'Service', icon: '🧬', description: 'DNA test with "Indigenous Americas" category that can detect Native American ancestry. Combine with Dawes Roll research for complete heritage picture.', url: 'https://www.ancestry.com/dna', category: 'DNA', sourceType: 'dna_company', priority: 4, verified: true },
        { id: 'RS025', title: '23andMe — Native American & Indigenous Heritage', type: 'Service', icon: '🧬', description: 'Reports Native American genetic ancestry. Note: DNA alone cannot prove tribal citizenship — Dawes Roll documentation is required for enrollment.', url: 'https://www.23andme.com', category: 'DNA', sourceType: 'dna_company', priority: 3, verified: true },
        { id: 'RS026', title: 'FamilyTreeDNA — Indigenous Migration Patterns', type: 'Service', icon: '🧬', description: 'Advanced Y-DNA and mtDNA testing that traces deep ancestral migration patterns. Can identify Native American haplogroups A, B, C, D, and X.', url: 'https://www.familytreedna.com', category: 'DNA', sourceType: 'dna_company', priority: 5, verified: true },
        { id: 'RS027', title: 'Understanding DNA Results for Freedmen Descendants', type: 'Guide', icon: '🧬', description: 'Educational guide explaining why many Freedmen descendants show mixed Indigenous heritage in DNA results. Covers haplogroups, admixture, and how to interpret results in the context of Five Tribes heritage.', url: 'https://isogg.org/wiki/Native_American_DNA', category: 'DNA', sourceType: 'academic', priority: 3, verified: true },
        { id: 'RS037', title: 'African Ancestry DNA — African Lineage Testing', type: 'Service', icon: '🧬', description: 'DNA testing focused specifically on African lineage. Traces maternal and paternal ancestry to specific African ethnic groups and countries of origin. Valuable for Freedmen descendants seeking African roots.', url: 'https://africanancestry.com', category: 'DNA', sourceType: 'dna_company', priority: 3, verified: true },
        { id: 'RS038', title: 'Freedmen\'s Bureau Online Records — FamilySearch', type: 'Archive', icon: '🧬', description: 'Digitized Freedmen\'s Bureau records on FamilySearch. Contains labor contracts, marriage records, hospital records, and ration lists for formerly enslaved people in the post-Civil War era, including Indian Territory.', url: 'https://www.familysearch.org/en/wiki/Freedmen%27s_Bureau_Online', category: 'DNA', sourceType: 'government', priority: 4, verified: true },

        // === HISTORICAL DOCUMENTS & TREATIES ===
        { id: 'RS028', title: 'Treaty of 1866 — Cherokee Nation', type: 'Document', icon: '📜', description: 'Post-Civil War treaty between Cherokee Nation and U.S. government. Article 9 granted Cherokee Freedmen and their descendants "all the rights of native Cherokees." Foundation of Freedmen citizenship rights.', url: 'https://www.okhistory.org/publications/enc/entry?entry=TR004', category: 'Government' },
        { id: 'RS029', title: 'Treaty of 1866 — Choctaw & Chickasaw Nations', type: 'Document', icon: '📜', description: 'Reconstruction treaty requiring adoption of Freedmen as tribal citizens. Article 3 provided that Freedmen "shall have the right to as much land as they may cultivate." Key document for Choctaw Freedmen claims.', url: 'https://www.okhistory.org/publications/enc/entry?entry=TR006', category: 'Government' },
        { id: 'RS030', title: 'Treaty of 1866 — Creek (Muscogee) Nation', type: 'Document', icon: '📜', description: 'Treaty granting Creek Freedmen "all the rights and privileges of native citizens." Established that Freedmen could participate in Creek Nation government and receive land allotments.', url: 'https://www.okhistory.org/publications/enc/entry?entry=TR005', category: 'Government' },
        { id: 'RS031', title: 'Treaty of 1866 — Seminole Nation', type: 'Document', icon: '📜', description: 'Seminole reconstruction treaty recognizing Freedmen as full citizens of the Seminole Nation. Established the Dosar Barkus and Caesar Bruner Freedmen bands.', url: 'https://www.okhistory.org/publications/enc/entry?entry=TR007', category: 'Government' },
        { id: 'RS032', title: 'Curtis Act of 1898', type: 'Document', icon: '📜', description: 'Federal legislation that dissolved tribal governments and mandated the Dawes Commission allotment process. Led directly to the creation of the Dawes Rolls used for Freedmen enrollment.', url: 'https://www.okhistory.org/publications/enc/entry?entry=CU006', category: 'Government' },
        { id: 'RS033', title: 'Freedmen Bureau Records — Indian Territory', type: 'Archive', icon: '📚', description: 'Bureau of Refugees, Freedmen, and Abandoned Lands records specifically for Indian Territory (1865-1872). Contains labor contracts, marriage records, and ration lists for Freedmen in the Five Tribes.', url: 'https://www.familysearch.org/wiki/en/Freedmen%27s_Bureau_Records', category: 'Government' },
        { id: 'RS034', title: 'FamilySearch — Five Tribes Freedmen Collections', type: 'Website', icon: '🌐', description: 'Free digitized records including Freedmen Bureau files, Indian Territory court records, tribal census rolls, and allotment documents specific to the Five Civilized Tribes.', url: 'https://www.familysearch.org/search/collection/list?page=1&q=freedmen%20indian%20territory', category: 'Website' },

        // === ADDITIONAL RESEARCH WEBSITES ===
        { id: 'RS035', title: 'Indian Territory Maps & Land Records', type: 'Website', icon: '🌐', description: 'Digitized maps of Indian Territory showing tribal boundaries, Freedmen allotment locations, and town sites. Essential for understanding where your ancestors lived and received land.', url: 'https://digital.libraries.ou.edu/indianterritory', category: 'Website' },
        { id: 'RS036', title: 'Bureau of Indian Affairs — CDIB Applications', type: 'Government', icon: '🏛️', description: 'Information on applying for Certificate of Degree of Indian Blood through the BIA. Required by some tribes for enrollment. Southern Plains Regional Office: (405) 247-6673.', url: 'https://www.bia.gov/service/tribal-enrollment', category: 'Government' },

        // === FAMILY TREE & GENEALOGY GUIDES ===
        { id: 'RS039', title: 'FamilySearch — Family Tree Building Guide', type: 'Guide', icon: '🌳', description: 'Free step-by-step guide to building your family tree on FamilySearch. Includes how to add ancestors, attach records, and collaborate with other researchers tracing Five Tribes Freedmen lineage.', url: 'https://www.familysearch.org/en/help/helpcenter/article/how-do-i-use-family-tree', category: 'Family Tree', sourceType: 'government', priority: 4, verified: true },
        { id: 'RS040', title: 'Ancestry — Getting Started with Your Family Tree', type: 'Guide', icon: '🌳', description: 'Beginner guide to creating a family tree on Ancestry.com. Learn to add ancestors, search historical records, and connect with DNA matches to extend your Freedmen genealogy research.', url: 'https://support.ancestry.com/s/article/Getting-Started-with-Your-Tree', category: 'Family Tree', sourceType: 'dna_company', priority: 3, verified: true },
        { id: 'RS041', title: 'National Archives — Genealogy Charts & Forms', type: 'Guide', icon: '🌳', description: 'Official genealogy research forms including pedigree charts, family group sheets, and correspondence logs. Essential for organizing Freedmen ancestor documentation before tribal enrollment applications.', url: 'https://www.archives.gov/research/genealogy/charts', category: 'Family Tree', sourceType: 'government', priority: 5, verified: true },
    ],

    // ============== ORAL HISTORIES SAMPLE ==============
    oralHistories: [
        { id: 'OH001', title: 'Grandmother\'s Stories of Fort Gibson', narrator: 'Ella Mae Washington', year: 2019, duration: '23:45', description: 'Ella Mae recounts stories passed down from her grandmother about life as a Cherokee Freedwoman in Fort Gibson, Indian Territory.', tags: ['Cherokee', 'Fort Gibson', 'Daily Life'] },
        { id: 'OH002', title: 'The Allotment Land We Lost', narrator: 'James Brown Jr.', year: 2020, duration: '18:30', description: 'James describes how his family\'s Creek Freedmen allotment near Okmulgee was taken through grafting schemes in the early 1900s.', tags: ['Creek', 'Land Loss', 'Grafting'] },
        { id: 'OH003', title: 'Black Seminole Warriors', narrator: 'Charles Robinson III', year: 2018, duration: '31:15', description: 'Oral tradition of Black Seminole military service from the Seminole Wars through World War II.', tags: ['Seminole', 'Military', 'Black Seminoles'] },
        { id: 'OH004', title: 'Boley: Our All-Black Town', narrator: 'Dorothy Mae Harris', year: 2021, duration: '27:00', description: 'Stories of growing up in Boley, Oklahoma — one of many all-Black towns founded by Freedmen descendants.', tags: ['All-Black Towns', 'Boley', 'Community'] },
        { id: 'OH005', title: 'Walking the Trail of Tears', narrator: 'Rev. Thomas Mitchell', year: 2017, duration: '15:45', description: 'Family oral history of ancestors who were enslaved by Cherokee and forced to walk the Trail of Tears from Georgia to Indian Territory.', tags: ['Cherokee', 'Trail of Tears', 'Removal'] },
    ],

    // ============== NOTIFICATIONS ==============
    notifications: [
        { id: 'N001', title: 'New Record Match', description: 'A potential match was found for "Washington" in the Cherokee Freedmen rolls.', time: '10 minutes ago', type: 'match', page: 'dawes-rolls' },
        { id: 'N002', title: 'Community Reply', description: 'Heritage_Seeker_405 replied to your post about Creek Freedmen records.', time: '1 hour ago', type: 'community', page: 'community' },
        { id: 'N003', title: 'Research Tip', description: 'The National Archives has digitized new Dawes Commission correspondence files.', time: '3 hours ago', type: 'tip', page: 'resources' },
    ],

    // ============== SAMPLE FAMILY TREE ==============
    // Authentic Black Indigenous Freedmen names from all Five Civilized Tribes
    sampleFamilyTree: {
        id: 'root',
        name: 'Robert Williams',
        birth: 'c. 1858',
        death: 'c. 1930',
        tribe: 'Choctaw Freedman',
        rollNumber: 2241,
        gender: 'M',
        spouse: {
            id: 'spouse-root',
            name: 'Clara Williams',
            birth: 'c. 1862',
            death: 'c. 1935',
            tribe: 'Choctaw Freedman',
            gender: 'F',
        },
        children: [
            {
                id: 'child-1',
                name: 'James Williams',
                birth: 'c. 1885',
                death: 'c. 1955',
                tribe: 'Choctaw Freedman',
                gender: 'M',
                spouse: { id: 'sp-child-1', name: 'Lucinda Vann', birth: '1889', death: '1962', tribe: 'Cherokee Freedman', gender: 'F' },
                children: [
                    { id: 'gc-1', name: 'Samuel Williams', birth: '1910', death: '1978', tribe: 'Choctaw Freedman', gender: 'M', children: [] },
                    { id: 'gc-2', name: 'Ella Mae Williams', birth: '1913', death: '2001', tribe: 'Choctaw Freedman', gender: 'F', children: [] },
                    { id: 'gc-3', name: 'George Williams', birth: '1916', death: '1985', tribe: 'Choctaw Freedman', gender: 'M', children: [] },
                ]
            },
            {
                id: 'child-2',
                name: 'Dorothy Williams',
                birth: 'c. 1890',
                death: 'c. 1970',
                tribe: 'Choctaw Freedman',
                gender: 'F',
                spouse: { id: 'sp-child-2', name: 'Moses Colbert', birth: '1886', death: '1958', tribe: 'Chickasaw Freedman', gender: 'M' },
                children: [
                    { id: 'gc-4', name: 'Patience Colbert', birth: '1912', death: '1990', tribe: 'Chickasaw Freedman', gender: 'F', children: [] },
                    { id: 'gc-5', name: 'Isaac Colbert', birth: '1915', death: '1982', tribe: 'Chickasaw Freedman', gender: 'M', children: [] },
                ]
            },
            {
                id: 'child-3',
                name: 'Hannah Williams',
                birth: 'c. 1893',
                death: 'c. 1965',
                tribe: 'Choctaw Freedman',
                gender: 'F',
                spouse: { id: 'sp-child-3', name: 'Caesar Bruner', birth: '1890', death: '1960', tribe: 'Seminole Freedman (Bruner Band)', gender: 'M' },
                children: [
                    { id: 'gc-6', name: 'Rachel Bruner', birth: '1918', death: '1995', tribe: 'Seminole Freedman', gender: 'F', children: [] },
                ]
            },
            {
                id: 'child-4',
                name: 'Henry Williams',
                birth: 'c. 1896',
                death: 'c. 1950',
                tribe: 'Choctaw Freedman',
                gender: 'M',
                spouse: { id: 'sp-child-4', name: 'Delia Checote', birth: '1898', death: '1972', tribe: 'Creek Freedman', gender: 'F' },
                children: [
                    { id: 'gc-7', name: 'Thomas Williams', birth: '1920', death: '1988', tribe: 'Creek Freedman', gender: 'M', children: [] },
                    { id: 'gc-8', name: 'Susie Williams', birth: '1923', death: '2010', tribe: 'Creek Freedman', gender: 'F', children: [] },
                ]
            },
        ]
    },

    // ============== VIDEO LEARNING CENTER ==============
    videoSlideshows: [
        {
            id: 'dawes-rolls-guide',
            title: 'The Dawes Rolls: Complete Guide',
            description: 'A comprehensive visual guide to understanding, searching, and interpreting the Dawes Rolls — the most important genealogy records for Five Tribes Freedmen descendants.',
            icon: '&#128220;',
            color: '#FFB830',
            slides: [
                { title: 'What Are the Dawes Rolls?', content: 'The Dawes Rolls (1898-1914) were created by the Dawes Commission to register members of the Five Civilized Tribes for individual land allotments. This was the largest enrollment effort in Native American history, recording over 101,000 people across Cherokee, Choctaw, Creek, Chickasaw, and Seminole Nations.', fact: 'Over 23,000 Freedmen were enrolled on the Dawes Rolls across all Five Tribes.' },
                { title: 'Why Freedmen Were Included', content: 'After the Civil War, the 1866 Reconstruction Treaties required all Five Tribes to grant citizenship to their formerly enslaved people — the Freedmen. When the Dawes Commission began enrollment, Freedmen were placed on separate "Freedmen Rolls" rather than the rolls "By Blood." This separation continues to impact tribal citizenship today.', fact: 'The Cherokee Freedmen Roll contains approximately 4,924 names.' },
                { title: 'What Information Is Recorded', content: 'Each Dawes Roll entry includes: Roll Number, Name, Age, Sex, Blood Quantum (listed as "Freedman"), Post Office/Location, Enrollment Date, Tribal District, Card Number, and Notes. The enrollment card (census card) often lists entire families together and includes cross-references to earlier rolls.', fact: 'Each census card could contain up to 6 family members on a single card.' },
                { title: 'How to Search the Dawes Rolls', content: 'Start with a surname search at the National Archives (archives.gov) or Access Genealogy (accessgenealogy.com). Try spelling variations — names were often recorded phonetically. If you know the tribe, narrow your search to that specific tribal roll. The Freedmen rolls are separate from Blood rolls, so make sure you are searching the correct index.', fact: 'Many Freedmen took the surnames of their former tribal enslavers.' },
                { title: 'Understanding Roll Numbers', content: 'Each person received a unique roll number within their tribal roll. Cherokee Freedmen numbers are different from Creek Freedmen numbers. The card number groups family members together. Your ancestor\'s roll number is the master key to unlocking all other records — land allotments, enrollment packets, and application jackets.', fact: 'Roll numbers were assigned roughly in order of enrollment, not alphabetically.' },
                { title: 'The Enrollment Packet', content: 'Behind every Dawes Roll entry is an enrollment packet (application jacket) at the National Archives in Fort Worth, TX. These packets can contain: the original application, witness testimony, birth/death certificates, letters, earlier census references, and notes from the Dawes Commission. These are genealogy gold mines.', fact: 'Some enrollment packets contain 50+ pages of family history documentation.' },
                { title: 'Common Challenges', content: 'Spelling variations (Johnson/Johnston), incorrect ages, missing family members, and duplicate entries are common issues. Some Freedmen were denied enrollment — check the "Rejected" and "Doubtful" rolls. Names may appear differently on the 1880 Census, Kern-Clifton Roll, or Wallace Roll compared to the Dawes Roll.', fact: 'The Dawes Commission rejected approximately 25% of all applications.' },
                { title: 'Beyond the Dawes Rolls', content: 'Cross-reference your Dawes Roll findings with: 1880 Cherokee Census, Kern-Clifton Roll (1896), Wallace Roll (1890), Freedmen Bureau Records (1865-1872), 1900 US Federal Census, Land Allotment Records, and County Marriage/Death Records. Each source adds new details to your family story.', fact: 'The 1900 Census was the first to cover Indian Territory and includes tribal affiliation columns.' }
            ]
        },
        {
            id: 'five-tribes-history',
            title: 'History of the Five Civilized Tribes',
            description: 'Explore the deep history of the Cherokee, Choctaw, Creek, Chickasaw, and Seminole Nations — from their southeastern homelands through removal, slavery, the Civil War, and the Freedmen legacy.',
            icon: '&#127963;',
            color: '#E17055',
            slides: [
                { title: 'The Five Civilized Tribes', content: 'The Cherokee, Choctaw, Creek (Muscogee), Chickasaw, and Seminole Nations were called the "Five Civilized Tribes" by European colonists because they adopted aspects of Euro-American culture including written constitutions, farming practices, and — tragically — the institution of chattel slavery.', fact: 'By 1860, the Five Tribes collectively enslaved over 10,000 Black people.' },
                { title: 'Slavery in the Tribal Nations', content: 'Wealthy tribal citizens operated large plantations in the Southeast and later in Indian Territory. The Cherokee, Choctaw, and Chickasaw Nations had the most extensive slaveholding. Enslaved Black people cleared land, farmed, built infrastructure, and were integral to tribal economies. Some Black people also had deep kinship ties with tribal members.', fact: 'Stand Watie, the last Confederate general to surrender, was a Cherokee slaveholder.' },
                { title: 'Black Seminole Alliance', content: 'The Seminole Nation had a unique relationship with Black people. Rather than traditional chattel slavery, many Black Seminoles lived in separate villages, bore arms, served as interpreters, and fought alongside Seminoles against the US military. The Dosar Barkus and Caesar Bruner bands are Freedmen bands recognized within the Seminole Nation today.', fact: 'Black Seminole scout John Horse led his people to freedom in Mexico in 1849.' },
                { title: 'The Trail of Tears (1830s)', content: 'The Indian Removal Act of 1830 forced the Five Tribes from their southeastern homelands to Indian Territory (present-day Oklahoma). Enslaved Black people were forced to march alongside their tribal enslavers on this devastating journey. Thousands died from exposure, disease, and starvation.', fact: 'An estimated 15,000 people died during the various removal marches.' },
                { title: 'The Civil War and Indian Territory', content: 'The Five Tribes were deeply divided during the Civil War. Most tribal governments allied with the Confederacy, but many individual citizens — especially full-bloods and Freedmen — supported the Union. Indian Territory became a brutal theater of guerrilla warfare. Enslaved Black people fled to Union lines when possible.', fact: 'The Battle of Honey Springs (1863) was a Union victory led partly by Black and Native troops.' },
                { title: 'Emancipation and the 1866 Treaties', content: 'After the Civil War, the US government negotiated new treaties with each tribe. The 1866 Treaties required all Five Tribes to abolish slavery and grant full citizenship rights — including land — to their formerly enslaved people, now called Freedmen. These treaties remain the legal foundation for Freedmen citizenship claims today.', fact: 'Article 9 of the 1866 Cherokee Treaty guaranteed Freedmen "all the rights of native Cherokees."' },
                { title: 'The Allotment Era', content: 'The Curtis Act of 1898 dissolved tribal governments and mandated individual land allotments. The Dawes Commission enrolled every tribal citizen, including Freedmen. Creek Freedmen received 160-acre allotments — the same as Creek citizens by blood. Many Freedmen allotments were later lost through fraud, the corrupt "guardian" system, and county court manipulation.', fact: 'Over 50 all-Black towns were founded in Oklahoma by Freedmen descendants.' },
                { title: 'The Freedmen Legacy Today', content: 'The struggle for Freedmen rights continues. In 2017, a federal court affirmed Cherokee Freedmen citizenship rights. Other tribes remain contested. Freedmen descendants carry a dual heritage — Black and Indigenous — that shaped Oklahoma, the American West, and our collective understanding of identity, belonging, and justice.', fact: 'Over 80,000 people may be eligible for Freedmen descendant citizenship across all Five Tribes.' }
            ]
        },
        {
            id: 'tribal-citizenship',
            title: 'How to Apply for Tribal Citizenship',
            description: 'Step-by-step walkthrough of the tribal citizenship application process for Freedmen descendants, including required documents, tribal contacts, and tips for success.',
            icon: '&#128203;',
            color: '#00B894',
            slides: [
                { title: 'Is Citizenship Possible?', content: 'Tribal citizenship eligibility varies by tribe. Cherokee Freedmen descendants have had full citizenship rights since a 2017 federal court ruling. Seminole Freedmen from the Dosar Barkus and Caesar Bruner bands can enroll. Creek (Muscogee) Nation reviews Freedmen applications individually. Choctaw and Chickasaw Nations currently require blood quantum proof, which excludes most Freedmen descendants.', fact: 'Over 10,000 Cherokee Freedmen descendants are currently enrolled as citizens.' },
                { title: 'Step 1: Establish Your Dawes Roll Lineage', content: 'The foundation of any tribal citizenship application is proving direct descent from an ancestor on the Dawes Rolls. You need your ancestor\'s Dawes Roll number and an unbroken chain of birth certificates, marriage records, and death certificates connecting you to that ancestor. Start by identifying your Dawes Roll ancestor.', fact: 'Most tribes accept CDIB (Certificate of Degree of Indian Blood) from the BIA as supplemental proof.' },
                { title: 'Step 2: Gather Vital Records', content: 'Collect these documents for every generation between you and your Dawes Roll ancestor: birth certificates (showing parents\' names), marriage certificates, death certificates, and court-ordered name change documents if applicable. Oklahoma vital records can be ordered from the Oklahoma State Department of Health.', fact: 'Oklahoma birth records before 1908 may not exist — use Census records as substitutes.' },
                { title: 'Step 3: Build the Generational Chain', content: 'Create a clear document showing each generation: Your Dawes Roll ancestor → their child → their grandchild → ... → you. Every link must be supported by official documents. If a name changed through marriage, you need the marriage certificate. If a name was legally changed, you need the court order.', fact: 'Three generations is the average chain length from a Dawes Roll ancestor to a modern applicant.' },
                { title: 'Step 4: Contact the Tribal Enrollment Office', content: 'Cherokee Nation: (918) 453-5000, cherokee.org — Freedmen welcome. Muscogee (Creek) Nation: (918) 732-7600, mcn-nsn.gov — Apply and await review. Seminole Nation: (405) 257-7200, sno-nsn.gov — Freedmen bands eligible. Choctaw Nation: (580) 924-8280 — Blood quantum required. Chickasaw Nation: (580) 436-2603 — Blood quantum required.', fact: 'The Cherokee Nation processes Freedmen applications in Tahlequah, OK.' },
                { title: 'Step 5: Submit Your Application', content: 'Complete the tribal enrollment application form (available on each tribe\'s website or by mail). Attach certified copies of all vital records, your Dawes Roll ancestor documentation, and any supplemental evidence. Some tribes charge a small application fee. Keep copies of everything you submit.', fact: 'Processing times range from 3 months (Cherokee) to 12+ months (Creek, Seminole).' },
                { title: 'Step 6: Follow Up and Appeal', content: 'After submitting, follow up with the enrollment office every 30-60 days. If your application is denied, most tribes have an appeal process. Common denial reasons: missing documents, unclear lineage connections, or name discrepancies. Fix the specific issue cited and resubmit. Legal assistance is available through NARF and Oklahoma Indian Legal Services.', fact: 'Approximately 15% of initial applications require additional documentation before approval.' },
                { title: 'Benefits of Tribal Citizenship', content: 'Enrolled citizens may access: tribal healthcare (Indian Health Service), education scholarships, housing assistance, tribal voting rights, cultural programs, language preservation classes, and a formal legal identity as a tribal citizen. Most importantly, enrollment preserves your family\'s Freedmen heritage for future generations.', fact: 'Cherokee Nation citizens have access to over $2 billion in annual tribal services.' }
            ]
        },
        {
            id: 'dna-testing',
            title: 'DNA Testing for Black Indigenous Ancestry',
            description: 'Learn how DNA testing works for Freedmen descendants, what to expect from results, which tests to take, and how to interpret Indigenous American markers in your DNA.',
            icon: '&#129516;',
            color: '#6C5CE7',
            slides: [
                { title: 'Why DNA Testing Matters', content: 'For Freedmen descendants, DNA testing can reveal Indigenous American ancestry that paper records alone cannot prove. Many Freedmen had mixed Black and Native heritage through generations of intermarriage and kinship. DNA testing supplements — but never replaces — paper documentation for tribal enrollment purposes.', fact: 'Studies show 30-40% of African Americans have at least 1% Native American DNA.' },
                { title: 'Types of DNA Tests', content: 'There are three main DNA tests: Autosomal DNA (tests all ancestors, best for ethnicity estimates), Y-DNA (traces paternal line only, father to son), and mtDNA (traces maternal line only, mother to all children). For finding Indigenous ancestry, autosomal testing is the most useful starting point.', fact: 'Autosomal DNA can reliably detect ancestry going back approximately 6-8 generations.' },
                { title: 'Recommended Testing Companies', content: 'CRI Genetics: Specializes in detecting Native American ancestry with detailed tribal migration patterns. AncestryDNA: Largest database, best for finding living relatives and matching family trees. 23andMe: Good ethnicity breakdown with health reports. FamilyTreeDNA: Best for Y-DNA and mtDNA deep-ancestry testing.', fact: 'AncestryDNA has over 22 million people in its database for matching.' },
                { title: 'Understanding Your Results', content: 'DNA results show percentage estimates by region. "Indigenous Americas" or "Native American" percentages indicate tribal ancestry. Even small percentages (1-5%) can reflect real ancestral connections 5-8 generations back. Remember: DNA is inherited randomly, so siblings can show different percentages from the same parents.', fact: 'DNA inheritance is random — you get approximately 50% from each parent, but not exactly.' },
                { title: 'Native American Haplogroups', content: 'Specific haplogroups indicate deep Indigenous ancestry: Maternal (mtDNA): A2, B2, C1, D1 — these are founding Native American maternal lineages. Paternal (Y-DNA): Q-M3 and C-P39. If your haplogroup matches one of these, you have confirmed Indigenous maternal or paternal lineage going back thousands of years.', fact: 'Haplogroup A2 is the most common Native American maternal lineage found in Freedmen descendants.' },
                { title: 'DNA and Tribal Enrollment', content: 'Important: No tribe currently accepts DNA testing alone as proof of citizenship. The Dawes Roll remains the legal requirement. DNA can help: confirm family connections to Dawes Roll ancestors, identify previously unknown relatives, and support lineage claims when combined with paper documentation.', fact: 'The Cherokee Nation specifically states that DNA tests cannot substitute for Dawes Roll lineage.' },
                { title: 'Building Your DNA Network', content: 'Upload your raw DNA data to GEDmatch (free) and DNA.Land for expanded matching. Connect with DNA matches who share Indigenous American segments. Join Freedmen DNA project groups on Facebook and at ISOGG.org. The more relatives you connect with, the stronger your family history documentation becomes.', fact: 'GEDmatch allows you to compare DNA across all major testing platforms for free.' },
                { title: 'Interpreting Mixed Heritage', content: 'Freedmen descendants often show a unique genetic profile: predominantly African ancestry with varying percentages of Native American and European. This reflects the complex history of the Five Tribes — where Black, Indigenous, and European ancestry intertwined over centuries. Your DNA tells a story of survival, resilience, and interconnected heritage.', fact: 'Some Freedmen descendants show up to 20% or more Native American DNA.' }
            ]
        },
        {
            id: 'treaties-1866',
            title: 'The 1866 Treaties Explained',
            description: 'A detailed breakdown of the Reconstruction Treaties of 1866 — the legal foundation for Freedmen citizenship rights in all Five Civilized Tribes.',
            icon: '&#128220;',
            color: '#FDCB6E',
            slides: [
                { title: 'Why New Treaties Were Needed', content: 'During the Civil War, most Five Tribes governments allied with the Confederacy. After the Union victory, the US government required new treaties as a condition for continued federal recognition. These 1866 Reconstruction Treaties addressed: abolition of slavery, Freedmen citizenship, land redistribution, railroad rights-of-way, and inter-tribal relations.', fact: 'The Five Tribes were the last slaveholders in US territory to formally abolish slavery.' },
                { title: 'Cherokee Treaty — Article 9', content: 'The Cherokee Treaty of July 19, 1866 is the most significant for Freedmen rights. Article 9 states that all Freedmen and free colored persons who were residing in Cherokee territory at the start of the war, or who returned within six months, "shall have all the rights of native Cherokees." This is the legal basis for Cherokee Freedmen citizenship today.', fact: 'A 2017 federal court ruled that Article 9 guarantees full Cherokee citizenship to Freedmen descendants.' },
                { title: 'Choctaw & Chickasaw Treaty', content: 'The Choctaw and Chickasaw signed a joint treaty on April 28, 1866. Article 3 gave these nations two years to adopt their Freedmen as citizens. If they failed to do so, the US government would remove the Freedmen to other lands and pay the tribes. The Choctaw eventually adopted Freedmen in 1885; the Chickasaw never formally adopted theirs.', fact: 'Chickasaw Freedmen remain the most legally vulnerable of all Five Tribes Freedmen.' },
                { title: 'Creek (Muscogee) Treaty', content: 'The Creek Treaty of June 14, 1866 (Article 2) granted Freedmen and their descendants "all the rights and privileges of native citizens, including an equal interest in the soil and national funds." Creek Freedmen received 160-acre allotments during the Dawes era — the same as Creek citizens by blood.', fact: 'Creek Freedmen currently can apply for citizenship, though approval is reviewed case by case.' },
                { title: 'Seminole Treaty', content: 'The Seminole Treaty of March 21, 1866 (Articles 2 and 3) was the most progressive. It granted Freedmen complete equality with Seminoles by blood and established that Freedmen would receive "such per capita" payments as Seminoles. The Dosar Barkus and Caesar Bruner Freedmen bands were formally recognized.', fact: 'The Seminole Treaty is considered the strongest legal protection for any group of Freedmen.' },
                { title: 'The Legal Battles', content: 'Since the 1970s, Freedmen descendants have fought in tribal, federal, and US Supreme Court proceedings to enforce these treaties. Key cases: Allen v. Cherokee Nation (1994), Cherokee Nation v. Nash (2017), Vann v. U.S. Dept. of Interior (2017). The Cherokee Freedmen victory in 2017 was a landmark — the court ruled that the 1866 Treaty is binding federal law.', fact: 'The Cherokee Freedmen case took over 10 years to reach final resolution.' },
                { title: 'Treaty Rights Today', content: 'Treaty enforcement remains uneven. Cherokee: Fully honoring Freedmen rights since 2017. Seminole: Recognizing Freedmen bands. Creek: Reviewing applications individually. Choctaw: Adopted Freedmen historically but now requires blood quantum. Chickasaw: Never adopted Freedmen, no current path to enrollment. Federal legislation has been proposed to enforce all five treaties.', fact: 'Congressional bills to enforce Freedmen treaty rights have been introduced multiple times since 2007.' },
                { title: 'Why Treaties Matter', content: 'The 1866 Treaties are not just historical documents — they are active federal law. Treaties between the US government and sovereign tribal nations have the force of constitutional law. The promise made to Freedmen 160 years ago remains legally binding. Understanding these treaties empowers Freedmen descendants to advocate for their rights.', fact: 'Under the US Constitution, treaties are "the supreme law of the land" (Article VI).' }
            ]
        },
        {
            id: 'trail-of-tears',
            title: 'The Trail of Tears & Black Experience',
            description: 'The untold story of enslaved Black people who were forced to march alongside the Five Civilized Tribes during the devastating forced removals of the 1830s.',
            icon: '&#128700;',
            color: '#E84393',
            slides: [
                { title: 'The Indian Removal Act of 1830', content: 'President Andrew Jackson signed the Indian Removal Act on May 28, 1830, authorizing the forced relocation of all Five Civilized Tribes from their southeastern homelands to Indian Territory (present-day Oklahoma). This began one of the darkest chapters in American history — and one that is rarely told from the perspective of the enslaved Black people who were also forced to march.', fact: 'Andrew Jackson personally enslaved over 300 Black people during his lifetime.' },
                { title: 'The Cherokee Removal (1838)', content: 'In 1838, 16,000 Cherokee were forced from their homes in Georgia, Tennessee, and the Carolinas. Approximately 1,600 enslaved Black people marched alongside them. They carried supplies, drove wagons, tended livestock, and cared for children. Enslaved people suffered the same exposure, disease, and starvation as their Cherokee enslavers — but with even fewer resources.', fact: 'An estimated 4,000 Cherokee and an unknown number of enslaved Black people died during the march.' },
                { title: 'The Choctaw Removal (1831-1833)', content: 'The Choctaw were the first tribe removed under the Indian Removal Act. Approximately 17,000 Choctaw and 500+ enslaved Black people made the journey from Mississippi to Indian Territory in three waves. The first winter march of 1831 was catastrophic — temperatures plunged, supplies ran out, and hundreds died of exposure and cholera.', fact: 'A Choctaw chief famously called the removal "a trail of tears and death."' },
                { title: 'The Creek Removal (1836)', content: 'After the Creek War of 1836, approximately 15,000 Creek people and their enslaved Black population were forcibly removed to Indian Territory. Many Creek were marched in chains alongside their enslaved people. The Creek removal was among the most brutal — the military forced the march at gunpoint through swamps and rivers.', fact: 'Some Creek Freedmen descendants still live near the original settlements in eastern Oklahoma.' },
                { title: 'The Chickasaw Removal (1837)', content: 'The Chickasaw Nation negotiated the best financial terms for removal but still suffered greatly. Wealthy Chickasaw slaveholders like the Colbert and Love families brought large numbers of enslaved Black people to Indian Territory. These enslaved people rebuilt plantations, cleared land, and established the agricultural economy of the new Chickasaw Nation.', fact: 'The Colbert family — prominent Chickasaw slaveholders — enslaved over 150 Black people.' },
                { title: 'The Seminole Removal (1836-1858)', content: 'Seminole removal was the most violent and prolonged, lasting over 20 years through three Seminole Wars. Black Seminoles fought alongside Seminoles against the US Army, making Seminole removal uniquely resistant. Many Black Seminoles were captured and re-enslaved by Creek slaveholders during the removal. Others escaped to Mexico.', fact: 'The Seminole Wars cost the US government over $40 million — more than any other Indian removal.' },
                { title: 'Life in Indian Territory', content: 'After removal, enslaved Black people rebuilt everything — homes, farms, roads, towns. In Indian Territory, the institution of slavery actually expanded. By 1860, the Five Tribes collectively enslaved over 10,000 Black people. But Black people also built communities, maintained cultural practices, formed families, and created the foundations for what would become the all-Black towns of Oklahoma.', fact: 'Over 50 all-Black towns were founded in Oklahoma after emancipation — more than any other state.' },
                { title: 'Remembering the Untold Story', content: 'The Trail of Tears is often told without mentioning the enslaved Black people who walked the same path. Their suffering, survival, and contributions are a critical part of this history. Today, Freedmen descendants carry the legacy of both the Trail of Tears and the Middle Passage — a dual heritage of displacement, resilience, and endurance that deserves full recognition.', fact: 'The National Trail of Tears commemorative sites rarely mention the enslaved Black people who marched.' }
            ]
        }
    ],

    // ============== GETTING STARTED STEPS ==============
    gettingStartedSteps: [
        { title: 'Gather What You Know', description: 'Start with yourself and work backwards. Collect names, dates, places, and stories from living relatives. Every detail matters — even partial names or approximate dates can lead to breakthroughs.' },
        { title: 'Talk to Your Elders', description: 'Record conversations with older family members. Ask about family surnames, where ancestors lived, tribal affiliations, and stories of life in Oklahoma or Indian Territory. These oral histories are your most valuable resource.' },
        { title: 'Search the Dawes Rolls', description: 'Use our Dawes Rolls search to find ancestors enrolled between 1898-1914. Search by surname, tribe, or location. Freedmen were enrolled on separate rolls — look for "Freedman" designation.' },
        { title: 'Cross-Reference Records', description: 'Don\'t stop at the Dawes Rolls. Cross-reference with Tribal Census Records (1850, 1860), Freedmen Bureau records, tribal census rolls (1880, 1890, 1896), and county records.' },
        { title: 'Check Land Allotment Records', description: 'Many Freedmen received land allotments in Indian Territory. These records include legal descriptions, acreage, and sometimes family relationships.' },
        { title: 'Build Your Family Tree', description: 'Use our Family Tree builder to organize your findings. Connect generations, add documents, and share with family members. Every connection you make preserves heritage for future generations.' },
        { title: 'Explore DNA Testing', description: 'Consider DNA testing to supplement paper records. Services like CRI Genetics and AncestryDNA can help trace Indigenous American ancestry and heritage composition.' },
        { title: 'Join the Community', description: 'Connect with other Freedmen descendants. Share discoveries, ask for help, and contribute to the collective knowledge base. Together we can piece together our shared history.' },
    ],

    // ============== FREEDMEN SURNAMES DATABASE ==============
    // Surnames documented in Dawes Rolls, Freedmen records, and tribal census
    // Each entry: { tribes: [], dawesEra: bool, notes: '' }
    freedmenSurnames: {
        'Adair': { tribes: ['Cherokee'], dawesEra: true, notes: 'Common Cherokee surname. Appears on both "by blood" and Freedmen rolls. The Adair family was prominent in Cherokee Nation.' },
        'Adams': { tribes: ['Cherokee', 'Choctaw', 'Creek'], dawesEra: true, notes: 'Widespread across multiple tribes. Found in Freedmen rolls for Cherokee, Choctaw, and Creek Nations.' },
        'Alberty': { tribes: ['Cherokee'], dawesEra: true, notes: 'Well-documented Cherokee family name. Multiple Alberty entries appear on Cherokee Freedmen rolls.' },
        'Aldrich': { tribes: ['Creek'], dawesEra: true, notes: 'Found in Creek Nation records. Check Creek Freedmen cards for Aldrich surname entries.' },
        'Alden': { tribes: ['Choctaw'], dawesEra: true, notes: 'Appears in Choctaw Nation records. Cross-reference with Choctaw Freedmen enrollment cards.' },
        'Aldwell': { tribes: ['Chickasaw'], dawesEra: true, notes: 'Found in Chickasaw Nation records. Check Chickasaw Freedmen rolls for Aldwell entries.' },
        'Allen': { tribes: ['Cherokee', 'Creek', 'Choctaw'], dawesEra: true, notes: 'Very common across Five Tribes. Multiple Allen families enrolled as Freedmen in Cherokee, Creek, and Choctaw Nations.' },
        'Alwell': { tribes: ['Chickasaw'], dawesEra: true, notes: 'Variant spelling found in Chickasaw Nation Freedmen records. Also check Aldwell.' },
        'Amely': { tribes: ['Creek'], dawesEra: true, notes: 'Found in Creek (Muscogee) Nation records. Check Creek Freedmen enrollment cards.' },
        'Armisty': { tribes: ['Cherokee'], dawesEra: true, notes: 'Appears in Cherokee Nation records. Cross-reference with Cherokee Freedmen rolls.' },
        'Arnold': { tribes: ['Cherokee', 'Creek'], dawesEra: true, notes: 'Found in both Cherokee and Creek Freedmen rolls. Multiple Arnold families documented in Indian Territory.' },
        'Ashley': { tribes: ['Choctaw', 'Chickasaw'], dawesEra: true, notes: 'Documented in Choctaw and Chickasaw Nations. Check both tribal Freedmen rolls.' },
        'Baker': { tribes: ['Cherokee', 'Creek', 'Choctaw'], dawesEra: true, notes: 'Widespread surname across multiple tribes. Found on Freedmen rolls in Cherokee, Creek, and Choctaw Nations.' },
        'Ballowe': { tribes: ['Choctaw'], dawesEra: true, notes: 'Found in Choctaw Nation Freedmen records. Cross-reference with Choctaw census rolls.' },
        'Bartlett': { tribes: ['Cherokee'], dawesEra: true, notes: 'Appears in Cherokee Nation records. Check Cherokee Freedmen enrollment cards.' },
        'Barton': { tribes: ['Creek', 'Seminole'], dawesEra: true, notes: 'Found in Creek and Seminole Nation records. Check both tribal Freedmen rolls.' },
        'Bast': { tribes: ['Choctaw'], dawesEra: true, notes: 'Found in Choctaw Nation Freedmen records. Cross-reference with Choctaw enrollment jackets at NARA.' },
        'Bealand': { tribes: ['Creek'], dawesEra: true, notes: 'Found in Creek (Muscogee) Nation Freedmen records. Check Creek Freedmen cards.' },
        'Beck': { tribes: ['Cherokee', 'Creek'], dawesEra: true, notes: 'Documented across Cherokee and Creek Nations. Check both Freedmen rolls.' },
        'Black': { tribes: ['Choctaw', 'Chickasaw'], dawesEra: true, notes: 'Found in Choctaw and Chickasaw Nation records. Cross-reference with both tribal Freedmen rolls.' },
        'Blakemore': { tribes: ['Cherokee'], dawesEra: true, notes: 'Appears in Cherokee Nation records. Check Cherokee Freedmen enrollment cards and census.' },
        'Blackman': { tribes: ['Creek'], dawesEra: true, notes: 'Found in Creek (Muscogee) Nation Freedmen records. Cross-reference with Creek enrollment jackets.' },
        'Brady': { tribes: ['Cherokee', 'Choctaw'], dawesEra: true, notes: 'Documented in Cherokee and Choctaw Nations. Check Freedmen rolls for both tribes.' },
        'Eagle': { tribes: ['Cherokee', 'Seminole'], dawesEra: true, notes: 'Found in Cherokee and Seminole Nation records. An evocative surname that may connect to tribal naming traditions.' },
        'Williams': { tribes: ['Cherokee', 'Creek', 'Choctaw', 'Chickasaw', 'Seminole'], dawesEra: true, notes: 'One of the most common Freedmen surnames across all Five Tribes. Extensive documentation in Dawes Rolls, Freedmen Bureau records, and tribal census.' },
        'Johnson': { tribes: ['Cherokee', 'Creek', 'Choctaw', 'Chickasaw'], dawesEra: true, notes: 'Very common surname across multiple tribes. Numerous Johnson families enrolled as Freedmen.' },
        'Wilson': { tribes: ['Cherokee', 'Creek', 'Choctaw'], dawesEra: true, notes: 'Found across Cherokee, Creek, and Choctaw Freedmen rolls. Multiple Wilson families documented in Indian Territory records.', aliases: [], category: 'Indigenous Ancestry Research', regions: ['Oklahoma', 'Indian Territory', 'Cherokee Nation', 'Creek Nation', 'Choctaw Nation'], recordTypes: ['Census Records', 'Allotment Records', 'Tribal Rolls', 'Dawes Rolls', 'Freedmen Records'], tags: ['Surname', 'Freedmen', 'Five Civilized Tribes'] },
        'Brown': { tribes: ['Cherokee', 'Creek', 'Choctaw', 'Seminole'], dawesEra: true, notes: 'Common surname across Four of the Five Tribes. Extensive presence in Freedmen enrollment records.' },
        'Davis': { tribes: ['Cherokee', 'Creek', 'Choctaw'], dawesEra: true, notes: 'Documented across Cherokee, Creek, and Choctaw Nations in Freedmen rolls.' },
        'Washington': { tribes: ['Cherokee', 'Creek'], dawesEra: true, notes: 'Found in Cherokee and Creek Freedmen rolls. George Washington appears as a sample entry in the Dawes Rolls database.' },
        'Braves': { tribes: ['Creek', 'Seminole'], dawesEra: true, notes: 'Found in Creek and Seminole Nation records. May relate to tribal naming conventions.' },
        'Break-bill': { tribes: ['Cherokee'], dawesEra: true, notes: 'Appears in Cherokee Nation Freedmen records. Hyphenated surnames were sometimes recorded during Dawes enrollment.' },
        'Brewer': { tribes: ['Cherokee', 'Creek'], dawesEra: true, notes: 'Documented in Cherokee and Creek Nations. Multiple Brewer families appear in Freedmen rolls.' },
        'Bruce': { tribes: ['Choctaw', 'Chickasaw'], dawesEra: true, notes: 'Found in Choctaw and Chickasaw Nation Freedmen records. Cross-reference with tribal enrollment cards.' },
        'Buckley': { tribes: ['Cherokee'], dawesEra: true, notes: 'Appears in Cherokee Nation records. Check Cherokee Freedmen Dawes cards.' },
        'Bryan': { tribes: ['Creek', 'Cherokee'], dawesEra: true, notes: 'Documented in Creek and Cherokee Nations. Check Freedmen rolls for both tribes.' },
        'Burdingston': { tribes: ['Choctaw'], dawesEra: true, notes: 'Found in Choctaw Nation Freedmen records. Less common surname — check Choctaw enrollment jackets at NARA.' },
        'Burnet': { tribes: ['Cherokee', 'Creek'], dawesEra: true, notes: 'Appears in Cherokee and Creek Freedmen records. Also check variant spelling Burnett.' },
        'Burry': { tribes: ['Choctaw'], dawesEra: true, notes: 'Found in Choctaw Nation records. Cross-reference with Choctaw Freedmen enrollment cards.' },
        'Byr': { tribes: ['Creek'], dawesEra: true, notes: 'Found in Creek (Muscogee) Nation Freedmen records. May be abbreviated form — also check Byrd, Byers.' },
        'Caesar': { tribes: ['Cherokee', 'Seminole'], dawesEra: true, notes: 'Documented in Cherokee and Seminole Nations. Classical given names adopted as surnames were common among Freedmen.' },
        'Caldwell': { tribes: ['Cherokee', 'Choctaw'], dawesEra: true, notes: 'Found in Cherokee and Choctaw Freedmen rolls. Multiple Caldwell families documented in Indian Territory.' },
        'Calwell': { tribes: ['Choctaw'], dawesEra: true, notes: 'Variant spelling of Caldwell found in Choctaw Nation records. Cross-reference both spellings.' },
        'Campbell': { tribes: ['Cherokee', 'Creek', 'Choctaw'], dawesEra: true, notes: 'Common surname across multiple tribes. Extensive Campbell entries in Freedmen rolls.' },
        'Carney': { tribes: ['Creek', 'Seminole'], dawesEra: true, notes: 'Found in Creek and Seminole Nation Freedmen records. Check both tribal enrollment cards.' },
        'Clay': { tribes: ['Cherokee', 'Choctaw'], dawesEra: true, notes: 'Documented in Cherokee and Choctaw Nations. Check Freedmen rolls for both tribes.' },
        'Beal': { tribes: ['Creek'], dawesEra: true, notes: 'Found in Creek (Muscogee) Nation records. Also check variant Bealand.' },
        'Beanland': { tribes: ['Creek', 'Choctaw'], dawesEra: true, notes: 'Found in Creek and Choctaw Freedmen records. Also check variant Bealand.' },
        'Blakeman': { tribes: ['Creek', 'Cherokee'], dawesEra: true, notes: 'Found in Creek and Cherokee records. Also check variant Blackman.' },
        'Broome': { tribes: ['Cherokee', 'Creek'], dawesEra: true, notes: 'Documented in Cherokee and Creek Nations. Check Freedmen enrollment cards for both tribes.' },
        'Coody': { tribes: ['Cherokee'], dawesEra: true, notes: 'Prominent Cherokee family name. Multiple Coody entries on Cherokee rolls. Cross-reference with Cherokee Freedmen cards.' },
        'Cooper': { tribes: ['Cherokee', 'Creek', 'Choctaw'], dawesEra: true, notes: 'Common surname across multiple tribes. Extensive Cooper entries in Freedmen rolls for Cherokee, Creek, and Choctaw Nations.' },
        'Crafton': { tribes: ['Choctaw'], dawesEra: true, notes: 'Found in Choctaw Nation Freedmen records. Check Choctaw enrollment jackets at NARA Fort Worth.' },
        'Coil': { tribes: ['Creek'], dawesEra: true, notes: 'Found in Creek (Muscogee) Nation records. Cross-reference with Creek Freedmen enrollment cards.' },
        'Fiels': { tribes: ['Cherokee'], dawesEra: true, notes: 'Appears in Cherokee Nation records. May be variant of Fields — check both spellings in Dawes index.' },
        'Fiscks': { tribes: ['Creek'], dawesEra: true, notes: 'Found in Creek Nation Freedmen records. Also check variant spellings Fisk, Fisks.' },
        'Freiek': { tribes: ['Choctaw'], dawesEra: true, notes: 'Found in Choctaw Nation records. Less common spelling — check Choctaw Freedmen enrollment cards and variant spellings.' },
        'Frances': { tribes: ['Cherokee', 'Creek'], dawesEra: true, notes: 'Documented in Cherokee and Creek Nations. Also check variant Francis in Freedmen rolls.' },
        'Furkes': { tribes: ['Chickasaw'], dawesEra: true, notes: 'Found in Chickasaw Nation Freedmen records. Also check variant Forks, Furks.' },
        'Croion': { tribes: ['Creek'], dawesEra: true, notes: 'Found in Creek (Muscogee) Nation records. Uncommon spelling — check Creek Freedmen cards and variant spellings.' },
        'Cutts': { tribes: ['Cherokee'], dawesEra: true, notes: 'Appears in Cherokee Nation Freedmen records. Cross-reference with Cherokee enrollment jackets.' },
        'Dalton': { tribes: ['Cherokee', 'Choctaw'], dawesEra: true, notes: 'Documented in Cherokee and Choctaw Nations. Check Freedmen rolls for both tribes.' },
        'Daniels': { tribes: ['Cherokee', 'Creek', 'Choctaw'], dawesEra: true, notes: 'Common surname across multiple tribes. Multiple Daniels families enrolled as Freedmen.' },
        'Darby': { tribes: ['Creek', 'Seminole'], dawesEra: true, notes: 'Found in Creek and Seminole Nation Freedmen records. Check both tribal enrollment cards.' },
        'Darnell': { tribes: ['Cherokee'], dawesEra: true, notes: 'Appears in Cherokee Nation records. Check Cherokee Freedmen Dawes cards and enrollment jackets.' },
        'Diggs': { tribes: ['Cherokee', 'Creek'], dawesEra: true, notes: 'Documented in Cherokee and Creek Nations. Check Freedmen rolls for both tribes.' },
        'Dream': { tribes: ['Creek'], dawesEra: true, notes: 'Found in Creek (Muscogee) Nation Freedmen records. Distinctive surname — may be easier to trace.' },
        'Doolie': { tribes: ['Choctaw'], dawesEra: true, notes: 'Found in Choctaw Nation records. Also check variant Dooley in Choctaw Freedmen rolls.' },
        'Edwards': { tribes: ['Cherokee', 'Creek', 'Choctaw'], dawesEra: true, notes: 'Common surname across multiple tribes. Extensive Edwards entries in Freedmen enrollment records.' },
        'Ezel': { tribes: ['Creek', 'Cherokee'], dawesEra: true, notes: 'Found in Creek and Cherokee Freedmen records. Also check variant Ezell, Ezel.' }
    }
};
