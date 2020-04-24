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
                    obj[headers[j]] = moment(currentline[j], 'YYYY-MM-DD');
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
            isoWeekday: true,
            displayFormats: {
                week: 'DD.MMM'
            }
        }
    }];

    const yLogAxes = [{
        type: 'logarithmic',
        ticks: {
            min: 0.1,
            autoSkipPadding: 14,
            callback: function (value, index, values) {
                return Number(value.toString())
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
    const latest = datasets1[0].data.slice(-1)[0].x.format('DD.MM.YYYY');
    document.getElementById('latest').innerHTML = latest;

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

    const datasets3 = Object.keys(locations).map(country => {
        return {
            label: country,
            data: data.filter(d => {
                return d.location === country
            }).map(d => {
                return { x: d.date, y: d.total_cases / locations[country] }
            }),
            hidden: (country === 'Serbia') ? false : true
        }
    });

    const chart1 = new Chart(document.getElementById('chart1').getContext('2d'), {
        type: 'line',
        data: {
            datasets: datasets1
        },
        options: {
            title: {
                text: 'Daily cases / per million'
            },
            legend: {
                onClick: function (evt, item) {
                    Chart.defaults.global.legend.onClick.call(chart1, evt, item)
                    Chart.defaults.global.legend.onClick.call(chart2, evt, item)
                    Chart.defaults.global.legend.onClick.call(chart3, evt, item)
                }
            },
            scales: {
                xAxes: xAxes,
                yAxes: yLogAxes
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

    const chart2 = new Chart(document.getElementById('chart2').getContext('2d'), {
        type: 'line',
        data: {
            datasets: datasets2
        },
        options: {
            title: {
                text: 'Total deaths / total cases'
            },
            legend: {
                onClick: function (evt, item) {
                    Chart.defaults.global.legend.onClick.call(chart1, evt, item)
                    Chart.defaults.global.legend.onClick.call(chart2, evt, item)
                    Chart.defaults.global.legend.onClick.call(chart3, evt, item)
                }
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

    const chart3 = new Chart(document.getElementById('chart3').getContext('2d'), {
        type: 'line',
        data: {
            datasets: datasets3
        },
        options: {
            title: {
                text: 'Total cases / per million'
            },
            legend: {
                onClick: function (evt, item) {
                    Chart.defaults.global.legend.onClick.call(chart1, evt, item)
                    Chart.defaults.global.legend.onClick.call(chart2, evt, item)
                    Chart.defaults.global.legend.onClick.call(chart3, evt, item)
                }
            },
            scales: {
                xAxes: xAxes,
                yAxes: yLogAxes
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

});

Chart.defaults.global.responsive = true;
Chart.defaults.global.maintainAspectRatio = false;
Chart.defaults.global.title.display = true;
Chart.defaults.global.title.fontSize = 18;
Chart.defaults.global.legend.align = 'end';
Chart.defaults.global.legend.position = 'right';
Chart.defaults.global.tooltips.mode = 'x';
Chart.defaults.global.tooltips.intersect = true;
Chart.defaults.global.elements.line.fill = false;
Chart.defaults.global.elements.point.radius = 0;
Chart.defaults.global.legend.labels.boxWidth = 12;
Chart.defaults.global.plugins.colorschemes.scheme = 'tableau.Tableau10';

document.getElementById("download1").addEventListener('click', function () {
    this.href = document.getElementById("chart1").toDataURL("image/png");
});
document.getElementById("download2").addEventListener('click', function () {
    this.href = document.getElementById("chart2").toDataURL("image/png");
});
document.getElementById("download3").addEventListener('click', function () {
    this.href = document.getElementById("chart3").toDataURL("image/png");
});