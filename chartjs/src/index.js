import axios from 'axios'
import Chart from 'chart.js';
import 'chartjs-adapter-moment';
import 'chartjs-plugin-colorschemes';
import moment from 'moment';

const locations = {
    'Serbia': 6.804596,
    'Slovenia': 2.078932,
    'Croatia': 4.105268,
    'Bulgaria': 6.948445,
    'Greece': 10.423056,
    // 'Sweden': 10.099270,
    'Romania': 19.237682,
    'Spain': 46.754783,
    'Italy': 60.461828,
    'Germany': 83.783945,
    'United States': 331.002647,
    // 'China': 1439.323774
}

function parse (csv) {
    const result = [];
    const lines = csv.split("\n");
    const headers = lines[0].split(",");
    for (let i = 1; i < lines.length; i++) {
        let obj = {};
        const currentline = lines[i].split(",");
        for (let j = 0; j < headers.length; j++) {
            switch (headers[j]) {
                case 'date':
                    obj[headers[j]] = moment(currentline[j]);
                    break
                case 'new_cases':
                case 'new_deaths':
                case 'total_cases':
                case 'total_deaths':
                    obj[headers[j]] = +currentline[j];
                    break
                default:
                    obj[headers[j]] = currentline[j];
            }
        }
        result.push(obj);
    }
    return result;
}

axios.get('https://covid.ourworldindata.org/data/ecdc/full_data.csv').then(resp => {
    const raw = parse(resp.data);
    const data = raw.filter(d => {
        return Object.keys(locations).indexOf(d.location) >= 0 && d.total_cases > 0
    });

    const xAxes = [{
        type: 'time',
        time: {
            unit: 'week',
            displayFormats: {
                week: 'DD.MMM'
            }
        }
    }];

    const datasets1 = Object.keys(locations).map(country => {
        return {
            label: country,
            data: data.filter(d => {
                return d.location === country
            }).map(d => {
                return { x: d.date, y: d.new_cases / locations[country] }
            }),
            hidden: (country === 'Serbia') ? false : true
        }
    });

    const datasets2 = Object.keys(locations).map(country => {
        return {
            label: country,
            data: data.filter(d => {
                return d.location === country
            }).map(d => {
                return { x: d.date, y: d.total_deaths / d.total_cases }
            }),
            hidden: (country === 'Serbia') ? false : true
        }
    });

    const ctx1 = document.getElementById('chart1').getContext('2d');
    const chart1 = new Chart(ctx1, {
        type: 'line',
        data: {
            datasets: datasets1
        },
        options: {
            legend: {
                display: true,
                onClick: function (evt, item) {
                    Chart.defaults.global.legend.onClick.call(chart1, evt, item)
                    Chart.defaults.global.legend.onClick.call(chart2, evt, item)
                }
            },
            scales: {
                xAxes: xAxes,
                yAxes: [{
                    type: 'logarithmic',
                    ticks: {
                        min: 0.1,
                        callback: function (value, index, values) {
                            return Number(value.toString())
                        }
                    }
                }]
            },
            tooltips: {
                callbacks: {
                    label: function (tooltipItem, data) {
                        let label = data.datasets[tooltipItem.datasetIndex].label + ' ';
                        label += Math.round(tooltipItem.yLabel * 10) / 10;
                        return label;
                    }
                }
            }
        }
    });

    const ctx2 = document.getElementById('chart2').getContext('2d');
    const chart2 = new Chart(ctx2, {
        type: 'line',
        data: {
            datasets: datasets2
        },
        options: {
            legend: {
                display: false
            },
            scales: {
                xAxes: xAxes,
                yAxes: [{
                    type: 'linear',
                    ticks: {
                        callback: function (value, index, values) {
                            return Math.round(value * 1000) / 10 + '%';
                        }
                    }
                }]
            },
            tooltips: {
                callbacks: {
                    label: function (tooltipItem, data) {
                        let label = data.datasets[tooltipItem.datasetIndex].label + ' ';
                        label += Math.round(tooltipItem.yLabel * 1000) / 10 + '%';
                        return label;
                    }
                }
            }
        }
    });
});

Chart.defaults.global.responsive = true;
Chart.defaults.global.tooltips.mode = 'x';
Chart.defaults.global.tooltips.intersect = true;
Chart.defaults.global.elements.line.fill = false;
Chart.defaults.global.legend.labels.boxWidth = 12;
Chart.defaults.global.plugins.colorschemes.scheme = 'tableau.Tableau10';
